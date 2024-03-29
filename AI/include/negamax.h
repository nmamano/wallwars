#ifndef NEGAMAX_H_
#define NEGAMAX_H_

#include <array>
#include <bitset>
#include <chrono>
#include <iostream>

#include "benchmark_metrics.h"
#include "constants.h"
#include "external/span.h"
#include "graph.h"
#include "macro_utils.h"
#include "move.h"
#include "situation.h"
#include "transposition_table.h"

namespace wallwars {
template <int R, int C>
class Negamax {
  static constexpr int kGameOverEval = 999;  // Larger than any real evaluation.

  static constexpr int kPossiblyIllegalMoveScore = -5000;
  static constexpr int kWinningMoveScore = 10000;

  TranspositionTable<R, C> TT;

  // The situation that moves are applied to to traverse the search tree.
  Situation<R, C> sit_;

  int ID_depth;
  std::chrono::high_resolution_clock::time_point search_start_timestamp;
  int search_millis;

 public:
  Move GetMove(Situation<R, C> sit, int millis) {
    search_start_timestamp = std::chrono::high_resolution_clock::now();
    search_millis = millis;
    sit_ = sit;
    for (ID_depth = 1; ID_depth < kMaxDepth; ++ID_depth) {
      int alpha = -2 * kGameOverEval;
      int beta = 2 * kGameOverEval;

      std::cout << "Search depth " << ID_depth << " with "
                << millis - MillisSince(search_start_timestamp)
                << " millis left." << std::endl;

      // The search store the best move in the TT.
      NegamaxEval(ID_depth, alpha, beta);

      TTEntry<R, C>& entry = TT.Entry(TT.Location(sit));
      std::cout << "Best move: "
                << sit.MoveToStandardNotation(MoveInTTEntry(entry))
                << " (eval: " << entry.eval << ")" << std::endl;

      if (entry.eval >= kGameOverEval) {
        std::cout << "Found winning move at depth " << ID_depth << "."
                  << std::endl;
        break;
      }
      if (entry.eval <= -kGameOverEval) {
        std::cout << "Position is lost at depth " << ID_depth << "."
                  << std::endl;
        break;
      }
      if (millis - MillisSince(search_start_timestamp) <= 0) break;
    }

    // Fetch best move from TT.
    TTEntry<R, C> entry = TT.Entry(TT.Location(sit));
    assert(entry.alpha_beta_flag == kExactFlag);
    Move move = {entry.token_change, {entry.edge0, entry.edge1}};
    sit.CrashIfMoveIsIllegal(move);
    return move;
  }

  // Evaluates situation `sit_` with the Negamax algorithm, exploring `depth`
  // moves ahead. Higher is better for the player to move.
  int NegamaxEval(int depth, int alpha, int beta) {
    if (sit_.IsGameOver()) {
      METRIC_INC(num_exits[depth][GAME_OVER_EXIT]);
      // Adding `depth` to winning positions makes the AI choose moves that
      // win faster. Subtracting `depth` from losing positions makes the AI
      // choose moves that take the longest to lose.
      int winner = sit_.Winner();
      if (winner == 2) return 0;  // Draw.
      return winner == sit_.turn ? kGameOverEval + depth
                                 : -kGameOverEval - depth;
    }
    if (depth == 0) {
      METRIC_INC(num_exits[depth][LEAF_EVAL_EXIT]);
      return (sit_.turn == 0 ? 1 : -1) * LeafEval();
    }

    // Read from TT.
    int starting_alpha = alpha;
    std::size_t tt_location = TT.Location(sit_);
    TTEntry<R, C>& tt_entry = TT.Entry(tt_location);
    bool found_tt_entry = TT.Contains(tt_location, sit_);
    if (found_tt_entry && tt_entry.depth >= depth) {
      assert(tt_entry.alpha_beta_flag != kEmptyEntry);
      if (tt_entry.alpha_beta_flag == kExactFlag) {
        METRIC_INC(num_exits[depth][TT_HIT_EXIT]);
        return tt_entry.eval;
      } else if (tt_entry.alpha_beta_flag == kLowerboundFlag) {
        if (tt_entry.eval > alpha) {
          METRIC_INC(tt_improvement_reads[depth]);
          alpha = tt_entry.eval;
        } else {
          METRIC_INC(tt_useless_reads[depth]);
        }
      } else /*(tt_entry.alpha_beta_flag == kUpperboundFlag)*/ {
        if (tt_entry.eval < beta) {
          METRIC_INC(tt_improvement_reads[depth]);
          beta = tt_entry.eval;
        } else {
          METRIC_INC(tt_useless_reads[depth]);
        }
      }
      if (alpha >= beta) {
        METRIC_INC(num_exits[depth][TT_CUTOFF_EXIT]);
        return tt_entry.eval;
      }
    }

    ScoredMove best_move;
    // `best_move_eval` is initialized to -2*kGameOverEval so that *some* move
    // is still chosen in the event that every move is losing, which are
    // evaluated to -kGameOverEval.
    best_move.score = -2 * kGameOverEval;

    // Before generating moves, try the cached move, if any. This can cause an
    // instant cut-off or improve the alpha.
    Move cached_move{tt_entry.token_change, {tt_entry.edge0, tt_entry.edge1}};
    if (found_tt_entry && sit_.IsLegalMove(cached_move)) {
      best_move.move = cached_move;
      sit_.ApplyMove(cached_move);
      int eval = -NegamaxEval(depth - 1, -beta, -alpha);
      sit_.UndoMove(cached_move);
      alpha = std::max(alpha, eval);
      // METRIC_INC(num_exits[depth][LEAF_EVAL_EXIT]);
      if (alpha >= beta) {
        UpdateTTEntry(found_tt_entry, tt_location, tt_entry, depth, cached_move,
                      eval, starting_alpha, beta);
        return eval;
      } else {
        best_move.move = cached_move;
        best_move.score = eval;
      }
    }

    // Before generating moves, try a double-walk move to see if it causes a
    // beta-cutoff or improves alpha.
    Move double_walk_move = GetDoubleWalkMove();
    if (sit_.IsLegalMove(double_walk_move)) {
      sit_.ApplyMove(double_walk_move);
      int eval = -NegamaxEval(depth - 1, -beta, -alpha);
      sit_.UndoMove(double_walk_move);
      alpha = std::max(alpha, eval);
      if (alpha >= beta) {
        UpdateTTEntry(found_tt_entry, tt_location, tt_entry, depth,
                      double_walk_move, eval, starting_alpha, beta);
        return eval;
      } else if (eval > best_move.score) {
        best_move.move = double_walk_move;
        best_move.score = eval;
      }
    }

    const auto& ordered_moves = OrderedMoves(depth - 1);
    METRIC_ADD(generated_children[depth], ordered_moves.size());
    for (const ScoredMove& scored_move : ordered_moves) {
      const Move& move = scored_move.move;

      // If it's a move that we haven't validated yet, we need to check if it is
      // legal.
      if (scored_move.score == kPossiblyIllegalMoveScore &&
          !sit_.IsLegalMove(move)) {
        continue;
      }

      sit_.ApplyMove(move);
      int move_eval = -NegamaxEval(depth - 1, -beta, -alpha);
      sit_.UndoMove(move);

      if (move_eval > alpha) {
        alpha = move_eval;
        best_move.score = move_eval;
        best_move.move = move;
        if (alpha >= beta) break;
      }

      // Only do this check at the shallowest level, and after the first ID
      // iteration. For the first ID iteration (depth 1) we want to finish to
      // ensure we have at least a move.
      if (ID_depth > 1 && depth == ID_depth &&
          MillisSince(search_start_timestamp) > search_millis) {
        std::cout << "Did not finish search at depth " << ID_depth << std::endl;
        break;
      }
    }

    UpdateTTEntry(found_tt_entry, tt_location, tt_entry, depth, best_move.move,
                  best_move.score, starting_alpha, beta);
    METRIC_INC(num_exits[depth][REC_EVAL_EXIT]);
    return best_move.score;
  }

  inline void UpdateTTEntry(bool found_tt_entry, std::size_t tt_location,
                            TTEntry<R, C>& tt_entry, int depth, Move move,
                            int eval, int starting_alpha, int beta) {
    // Update TT. Current policy: always update or replace.
    if (!found_tt_entry) {
      tt_entry.sit = sit_;
      if (TT.IsEmpty(tt_location)) {
        METRIC_INC(tt_add_writes[depth]);
      } else {
        METRIC_INC(tt_replace_writes[depth]);
      }
    }

    if (eval <= starting_alpha)
      tt_entry.alpha_beta_flag = kUpperboundFlag;
    else if (eval >= beta)
      tt_entry.alpha_beta_flag = kLowerboundFlag;
    else
      tt_entry.alpha_beta_flag = kExactFlag;

    tt_entry.depth = static_cast<int8_t>(depth);
    tt_entry.eval = static_cast<int16_t>(eval);
    tt_entry.token_change = static_cast<int8_t>(move.token_change);
    tt_entry.edge0 = static_cast<int16_t>(move.edges[0]);
    tt_entry.edge1 = static_cast<int16_t>(move.edges[1]);
  }

  // Evaluates situation `sit_` with the formula dist(p1, g1) - dist(p0, g0).
  // Higher is better for P0.
  inline int LeafEval() const {
    return sit_.G.Distance(sit_.tokens[1], Goals(R, C)[1]) -
           sit_.G.Distance(sit_.tokens[0], Goals(R, C)[0]);
  }

  Move GetDoubleWalkMove() {
    const std::array<int, NumNodes(R, C)> distances_from_goal =
        sit_.G.Distances(Goals(R, C)[sit_.turn]);
    for (int node : sit_.G.NodesAtDistance2(sit_.tokens[sit_.turn])) {
      if (node == -1) continue;
      if (distances_from_goal[node] ==
          distances_from_goal[sit_.tokens[sit_.turn]] - 2) {
        return DoubleWalkMove(sit_.tokens[sit_.turn], node);
      }
    }
    return DoubleWalkMove(sit_.tokens[sit_.turn], 996);
  }

  // Returns a list of legal moves ordered heuristically from best to worst
  // while trying to minimize the number of graph operations (distance
  // computations, reachability checks, etc.). It might not return every legal
  // move; it excludes moves that are provably suboptimal. Note: calls with a
  // given `depth` value overwrites the output returned for previous calls for
  // the same `depth`.
  nonstd::span<const ScoredMove> OrderedMoves(int depth) {
    // The size is an upper bound on the number of possible
    // moves. There is one thread_local array for each depth of the negamax
    // search. The function returns a prefix of the array for the given `depth`
    // as a span, so that no copies or allocations of the arrays need to happen.
    thread_local std::array<std::array<ScoredMove, MaxNumLegalMoves(R, C)>,
                            kMaxDepth>
        move_lists_all_depths;
    // `moves` is a reference to the array for the given `depth`. We will place
    // the moves in a prefix of `moves`.
    std::array<ScoredMove, MaxNumLegalMoves(R, C)>& moves =
        move_lists_all_depths[depth];
    // `move_index` is the first unused index in `moves`. It will advance for
    // each move generated. The function will return a span of `moves` from
    // index 0 to index `move_index`.
    int move_index = 0;

    // int8_t to int conversions.
    const std::array<int, 2> tokens = {sit_.tokens[0], sit_.tokens[1]};
    const int turn = sit_.turn;
    const int opp_turn = (turn == 0 ? 1 : 0);

    const std::array<std::array<int, NumNodes(R, C)>, 2> shortest_paths{
        sit_.G.ShortestPath(tokens[0], Goals(R, C)[0]),
        sit_.G.ShortestPath(tokens[1], Goals(R, C)[1])};

    const std::array<std::bitset<NumRealAndFakeEdges(R, C)>, 2> SP_edges{
        PathAsEdgeSet<R, C>(shortest_paths[0]),
        PathAsEdgeSet<R, C>(shortest_paths[1])};

    const std::bitset<NumRealAndFakeEdges(R, C)> bridges = sit_.G.Bridges();

    // A copy of the graph that we will modify, e.g., by pruning edges.
    Graph<R, C> G_pruned = sit_.G;

    // Disable bridges not in the shortest paths. Such bridges lead to "useless
    // zones", regions of the board without any goal or player. Since the only
    // way to get out of a useless zone is by crossing the bridge to it again,
    // it is never beneficial for a player to cross such a bridge. Thus, we
    // remove them so that they are not considered later during move generation.
    for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
      if (bridges[edge] && !SP_edges[0][edge] && !SP_edges[1][edge]) {
        G_pruned.DeactivateEdge(edge);
      }
    }

    // Get rid of unreachable edges after removing the bridges to "useless
    // zones". Since it is never beneficial for a player to go to a useless
    // zone, they also do not have any reason to build a wall in one. Thus, we
    // remove walls in dead zones so that they are not considered during move
    // generation.
    {
      const std::array<int, NumNodes(R, C)> connected_components =
          G_pruned.ConnectedComponents();
      const std::array<int, 2> token_CCs{connected_components[tokens[0]],
                                         connected_components[tokens[1]]};
      for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
        // Take an arbitrary endpoint of the edge and check its CC.
        int endpoint_cc = connected_components[LowerEndpoint(edge)];
        if (endpoint_cc != token_CCs[0] && endpoint_cc != token_CCs[1]) {
          G_pruned.DeactivateEdge(edge);
        }
      }
    }

    // Now, `G_pruned` consists of either a single connected component with
    // both players and both goals, or two connected components, one with one
    // player and goal each. In addition, every remaining bridge must be crossed
    // by every path of at least one of the players.
    int opp_dist = G_pruned.Distance(tokens[opp_turn], Goals(R, C)[opp_turn]);

    // Label edges by 2-edge connected component, using -1 for bridges, and -2
    // for disabled edges (i.e., fake edges, already-built walls, or pruned
    // edges).
    std::array<int, NumRealAndFakeEdges(R, C)> edge_labels;
    edge_labels.fill(-2);
    {
      const std::array<int, NumNodes(R, C)> two_edge_connected_components =
          G_pruned.TwoEdgeConnectedComponents();
      for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
        if (bridges[edge])
          edge_labels[edge] = -1;
        else if (G_pruned.edges[edge]) {
          // Take an arbitrary endpoint of the edge and label the edge with the
          // node's 2-edge CC. We are using the fact that if `edge` is not a
          // bridge, then both endpoints are in the same 2-edge CC.
          int endpoint_2ecc =
              two_edge_connected_components[LowerEndpoint(edge)];
          edge_labels[edge] = endpoint_2ecc;
        }
      }
    }

    // The number of edge labels corresponds to the number of 2-edge connected
    // components with at least one edge / two nodes.
    int num_labels;
    {
      int max_label = -2;
      for (int label : edge_labels) {
        if (label > max_label) max_label = label;
      }
      // Note that this works in the edge case where every edge is a bridge,
      // which are labeled -1, so `num_labels` gets a value of 0.
      num_labels = max_label + 1;
    }

    // Generate double-walk moves and walk-and-build moves.
    {
      const std::array<int, NumNodes(R, C)> distances_from_goal =
          G_pruned.Distances(Goals(R, C)[turn]);

      // Generate double-walk moves. They are scored based on how much they
      // reduce the distance to the goal. Each one-step reduction gets a score
      // of 10. Thus, moves can have a score of -20, 0, or 20.
      for (int node : G_pruned.NodesAtDistance2(tokens[turn])) {
        if (node == -1) continue;
        if (distances_from_goal[node] == 0) {
          bool is_draw_by_one_move = turn == 0 && opp_dist <= 2;
          if (!is_draw_by_one_move) {
            // We found a winning move, so we can discard any previously
            // generated moves and return the single winning move.
            moves[0] = {DoubleWalkMove(tokens[turn], node), kWinningMoveScore};
            DBGS(sit_.CrashIfMoveIsIllegal(moves[0].move));
            return nonstd::span<const ScoredMove>(moves.begin(),
                                                  moves.begin() + 1);
          }
        }
        const int dist_to_goal_reduction =
            distances_from_goal[tokens[turn]] - distances_from_goal[node];
        moves[move_index++] = {DoubleWalkMove(tokens[turn], node),
                               10 * dist_to_goal_reduction};
      }

      // Sometimes, it is convenient to be able to build a useless (but legal)
      // wall to make it possible to walk only one cell (e.g., if we are at
      // distance 1 from the goal). We can use one of the pruned edges. For
      // example, in this situation, edge 0 would be pruned, but it is the only
      // wall that can be built, so p0 would want to be able to build it and
      // walk a single square.
      //      |  |
      // --+--+--+--
      //   |  |  |
      // --+--+--+--
      //   |  |  |
      // --+--+--+--
      // g1    p0 p1 (g0 is at the same cell as p1).
      int useless_edge = -1;
      for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
        if (sit_.G.edges[edge] && !G_pruned.edges[edge]) {
          useless_edge = edge;
          break;
        }
      }

      // Generate walk-and-build moves.
      for (int node : G_pruned.GetNeighbors(tokens[turn])) {
        if (node == -1) continue;
        const int dist_to_goal_reduction =
            distances_from_goal[tokens[turn]] - distances_from_goal[node];
        const int walk_score = distances_from_goal[node] == 0
                                   ? kWinningMoveScore
                                   : 10 * dist_to_goal_reduction;

        // If we did not prune any edge in `G_pruned`, we would not have found a
        // useless edge yet. However, the edge crossed by the player to move to
        // `node` may become useless.
        int useless_edge_after_move = -1;
        if (useless_edge != -1) {
          useless_edge_after_move = useless_edge;
        } else {
          int candidate_useless_edge =
              EdgeBetweenNeighbors(R, C, tokens[turn], node);
          // `candidate_useless_edge` can be a useless edge if the move to
          // `node` turns it into a bridge to a "useless zone". The necessary
          // and sufficient conditions are: (i) `candidate_useless_edge` is a
          // bridge; (ii) `candidate_useless_edge` is not part of the shortest
          // path of the other player.
          if (edge_labels[candidate_useless_edge] == -1 &&
              !SP_edges[opp_turn][candidate_useless_edge]) {
            useless_edge_after_move = candidate_useless_edge;
          }
        }
        // At this point, we may or may not have a useless edge. For example, in
        // the following situation there are no useless edges:
        //   |  |  |
        // --+--+--+--
        //   |  |  |
        // --+--+--+--
        //   |  |  |
        // --+--+--+--
        // g1    p0 p1 (g0 is at the same cell as p1).
        // If it is p0's turn, p0 cannot win even though it is next to the goal,
        // because it cannot build any wall. They are all bridges in the path
        // from a player to its goal.

        // Consider edges to build along with the move to `node`.
        for (int edge = 0; edge < NumRealAndFakeEdges(R, C); edge++) {
          // Ignore disabled edges, except the useless edge.
          if (edge_labels[edge] == -2 && edge != useless_edge_after_move)
            continue;

          // Ignore bridges (since they can't be built, unless they became
          // useless due to the move)
          if (edge_labels[edge] == -1 && edge != useless_edge_after_move)
            continue;

          if (walk_score == kWinningMoveScore) {
            bool is_draw_by_one_move = turn == 0 && opp_dist <= 2;
            if (!is_draw_by_one_move) {
              // We found a winning move, so we can discard any previously
              // generated moves and return the single winning move.
              moves[0] = {WalkAndBuildMove(tokens[turn], node, edge),
                          kWinningMoveScore};
              DBGS(sit_.CrashIfMoveIsIllegal(moves[0].move));
              return nonstd::span<const ScoredMove>(moves.begin(),
                                                    moves.begin() + 1);
            }
          }
          // We score walk-and-build moves as follows: if the wall is in the
          // shortest path of the opponent, it gets a bonus of +5. If it is in
          // the player's shortest path, it gets a penalty of -4. The bonuses
          // and penalties are added to the walk score. Thus, moves can have a
          // score of -14, -10, -9, -5, 6, 10, 11, or 15. (We could compute how
          // much the distance to the goal of each player actually changes due
          // to building the wall, but that would require 2 extra graph
          // traversals.)
          const int wall_score = (SP_edges[turn][edge] ? -4 : 0) +
                                 (SP_edges[opp_turn][edge] ? 5 : 0);
          moves[move_index++] = {WalkAndBuildMove(tokens[turn], node, edge),
                                 walk_score + wall_score};
        }
      }
    }

    // Note: we could consider generating double-build moves with the useless
    // edge and a real edge. However, it's hard to imagine a situation where
    // that would be optimal.

    // Generate double-build moves consisting of edges in different
    // two-edge-connected components. These moves are cheap to generate since
    // they are always legal. We score each wall individually and add up their
    // scores. If the wall is in the shortest path of the opponent, it gets a
    // bonus of +7. If it is in the player's shortest path, it gets a penalty of
    // -6. Thus, moves can have a score of -12, -6, 0, 1, 7, or 14. (We could
    // compute how much the distance to the goal of each player actually changes
    // due to building the walls, but that would require 2 extra graph
    // traversals.)
    for (int edge1 = 0; edge1 < NumRealAndFakeEdges(R, C); ++edge1) {
      if (edge_labels[edge1] < 0) continue;  // Skip bridges and disabled edges.
      const int edge1_score = (SP_edges[turn][edge1] ? -6 : 0) +
                              (SP_edges[opp_turn][edge1] ? 7 : 0);
      for (int edge2 = edge1 + 1; edge2 < NumRealAndFakeEdges(R, C); ++edge2) {
        if (edge_labels[edge2] < 0 || edge_labels[edge1] == edge_labels[edge2])
          continue;
        const int edge2_score = (SP_edges[turn][edge2] ? -6 : 0) +
                                (SP_edges[opp_turn][edge2] ? 7 : 0);
        moves[move_index++] = {DoubleBuildMove(edge1, edge2),
                               edge1_score + edge2_score};
      }
    }

    // Generate double-build moves consisting of edges in the same
    // two-edge-connected components. These are the hardest ones to generate
    // while minimizing reachability computations.
    for (int label = 0; label < num_labels; ++label) {
      // The two-edge connected component with label `label`.
      Graph<R, C> subgraph = StartingGraph<R, C>();
      for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
        if (edge_labels[edge] != label) subgraph.DeactivateEdge(edge);
      }

      // First and last node in each player's shortest path through the two-edge
      // connected component `subgraph`, or -1 if a player's shortest path
      // does not intersect the subgraph.
      // todo: can this be computed at the same time for all labels?
      std::array<std::array<int, 2>, 2> subgraph_starts_and_ends;
      {
        const std::array<bool, NumNodes(R, C)> subgraph_nodes =
            subgraph.ActiveNodes();
        subgraph_starts_and_ends[0] =
            FirstAndLastNodeInSet(subgraph_nodes, shortest_paths[0]);
        subgraph_starts_and_ends[1] =
            FirstAndLastNodeInSet(subgraph_nodes, shortest_paths[1]);
      }

      // The distance for each player between its first and last nodes
      // intersecting the subgraph, or -1 if a player's shortest path
      // does not intersect the subgraph.
      std::array<int, 2> subgraph_distances{-1, -1};
      for (int i = 0; i < 2; ++i) {
        if (subgraph_starts_and_ends[i][0] != -1) {
          subgraph_distances[i] = subgraph.Distance(
              subgraph_starts_and_ends[i][0], subgraph_starts_and_ends[i][1]);
        }
      }

      // "Main" path edges. One path for each player between its first and last
      // nodes intersecting the subgraph. If a player does not traverse the
      // subgraph, then the value for that player is undefined.
      std::array<std::bitset<NumRealAndFakeEdges(R, C)>, 2> MP_edges;
      // Alternative path edges. These paths are edge-disjoint with the main
      // path edges.
      std::array<std::bitset<NumRealAndFakeEdges(R, C)>, 2> AP_edges;

      for (int i = 0; i < 2; ++i) {
        if (subgraph_starts_and_ends[i][0] == -1) continue;
        const std::array<std::array<int, NumNodes(R, C)>, 2>
            edge_disjoint_paths = subgraph.TwoEdgeDisjointPaths(
                subgraph_starts_and_ends[i][0], subgraph_starts_and_ends[i][1]);
        MP_edges[i] = PathAsEdgeSet<R, C>(edge_disjoint_paths[0]);
        AP_edges[i] = PathAsEdgeSet<R, C>(edge_disjoint_paths[1]);
      }

      // Finally, we consider every pair of edge in the subgraph.
      for (int edge1 = 0; edge1 < NumRealAndFakeEdges(R, C); ++edge1) {
        if (edge_labels[edge1] != label) continue;
        for (int edge2 = edge1 + 1; edge2 < NumRealAndFakeEdges(R, C);
             ++edge2) {
          if (edge_labels[edge2] != label) continue;
          // `subgraph_distances_after_build` stores the distance for each
          // player to cross `subgraph` after building the walls `edge1` and
          // `edge2`. We do not always need to compute those distances, in which
          // case `subgraph_distances_after_build` may contain the invalid
          // distance -2.
          if ((MP_edges[turn][edge1] && AP_edges[turn][edge2]) ||
              (MP_edges[turn][edge2] && AP_edges[turn][edge1])) {
            // edge1 and edge2 may disconnect the player from its goal. It's
            // probably a bad move, so we give it a really bad score and defer
            // checking if it is legal until it is time to explore it.
            moves[move_index++] = {DoubleBuildMove(edge1, edge2),
                                   kPossiblyIllegalMoveScore};
            continue;
          }
          int subgraph_opp_distance_after_build = -2;
          if ((MP_edges[opp_turn][edge1] && AP_edges[opp_turn][edge2]) ||
              (MP_edges[opp_turn][edge2] && AP_edges[opp_turn][edge1])) {
            // edge1 and edge2 may block the opponent's path. We need to check.
            Graph<R, C> subgraph_copy = subgraph;
            subgraph_copy.DeactivateEdge(edge1);
            subgraph_copy.DeactivateEdge(edge2);
            subgraph_opp_distance_after_build =
                subgraph_copy.Distance(subgraph_starts_and_ends[opp_turn][0],
                                       subgraph_starts_and_ends[opp_turn][1]);
            // The move is illegal because it disconnects the opponent from its
            // goal.
            if (subgraph_opp_distance_after_build == -1) continue;
          }

          // The move is legal. We score it as follows:
          int score = 0;

          // If we computed the distance after build of the opponent, we give a
          // 10 point bonus for each distance increase.
          if (subgraph_opp_distance_after_build != -2) {
            const int opp_dist_to_goal_increase =
                subgraph_opp_distance_after_build -
                subgraph_distances[opp_turn];
            score += 10 * opp_dist_to_goal_increase;
          }

          // Given a penalty if the walls block the player's paths.
          if (MP_edges[turn][edge1] || MP_edges[turn][edge2]) {
            score -= 6;
          } else if (AP_edges[turn][edge1] || AP_edges[turn][edge2]) {
            score -= 3;
          }

          // Given a bonus if the walls block the opponent's paths. The bonus is
          // largest if it blocks both the main and alternative paths.
          if ((MP_edges[opp_turn][edge1] && AP_edges[opp_turn][edge2]) ||
              (MP_edges[opp_turn][edge2] && AP_edges[opp_turn][edge1])) {
            score += 10;
          } else if (MP_edges[opp_turn][edge1] || MP_edges[opp_turn][edge2]) {
            score += 7;
          } else if (AP_edges[opp_turn][edge1] || AP_edges[opp_turn][edge2]) {
            score += 4;
          }

          moves[move_index++] = {DoubleBuildMove(edge1, edge2), score};
        }
      }
    }

    // Sort the moves from largest to smallest score.
    // Todo: maybe bucket sort is faster?
    std::sort(moves.begin(), moves.begin() + move_index,
              [](const ScoredMove& lhs, const ScoredMove& rhs) {
                return lhs.score > rhs.score;
              });

    // Only in debug mode, assert that every move generated is legal.
    DBGS(for (auto scored_move
              : nonstd::span<ScoredMove>(moves.begin(),
                                         moves.begin() + move_index)) {
      if (scored_move.score != kPossiblyIllegalMoveScore)
        sit_.CrashIfMoveIsIllegal(scored_move.move);
    });
    return nonstd::span<const ScoredMove>(moves.begin(),
                                          moves.begin() + move_index);
  }

  // Given a list of nodes `node_list` and a set of nodes `node_set`, returns
  // two nodes: (1) the first and last nodes in `node_list` that are in
  // `node_set`, if any, or {-1, -1} otherwise. Assumes that all nodes in
  // `node_list` in `node_set` are contiguous in `node_list`. There are 5 cases:
  // 1. `node_list` and `node_set` are disjoint. Returns {-1, -1}.
  // 2. `node_list` and `node_set` are not disjoint...
  // 2.a) `node_set` does not contain s nor t. Returns {x, y}.
  // 2.b) `node_set` contains s but not t. Returns {s, y}.
  // 2.c) `node_set` contains t but not s. Returns {x, t}.
  // 2.d) `node_set` contains s and t. Returns {s, t}.
  // Where x and y are nodes in `node_list` (possibly the same, and possibly
  // equal to s or t).
  std::array<int, 2> FirstAndLastNodeInSet(
      const std::array<bool, NumNodes(R, C)>& node_set,
      const std::array<int, NumNodes(R, C)>& node_list) {
    int x = -1, y = -1;
    for (int node : node_list) {
      if (node == -1) break;
      if (node_set[node]) {
        if (x == -1) x = node;
        y = node;
      } else if (x != -1)
        break;
    }
    return {x, y};
  }

  Move MoveInTTEntry(const TTEntry<R, C>& entry) {
    return {entry.token_change, {entry.edge0, entry.edge1}};
  }

  friend class Benchmark;
  friend class Tests;
};

}  // namespace wallwars

#endif  // NEGAMAX_H_