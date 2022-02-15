#include "negamaxer.h"

#include <array>
#include <bitset>
#include <iostream>

#include "external/span.h"
#include "graph.h"
#include "macros.h"
#include "move.h"
#include "situation.h"

namespace {

constexpr int kInfinity = 999;  // Larger than any real evaluation.

// Alpha-beta flags.
constexpr int8_t kExactFlag = 0;
constexpr int8_t kLowerboundFlag = 1;
constexpr int8_t kUpperboundFlag = 2;

}  // namespace

int Negamaxer::DirectEval() const {
  return sit_.G.Distance(sit_.tokens[1], kGoals[1]) -
         sit_.G.Distance(sit_.tokens[0], kGoals[0]);
}

int Negamaxer::NegamaxEval(int depth, int alpha, int beta) {
  ++num_evals_;
  if (sit_.IsGameOver()) {
    // Adding `depth` to winning positions makes the AI choose moves that
    // win faster. Subtracting `depth` from losing positions makes the AI choose
    // moves that take the longest to lose.
    int winner = sit_.Winner();
    if (winner == 2) return 0;  // Draw.
    return winner == sit_.turn ? kInfinity + depth : -kInfinity - depth;
  }
  if (depth == 0) {
    return (sit_.turn == 0 ? 1 : -1) * DirectEval();
  }
  int starting_alpha = alpha;
  auto memo_entry = memoized_evals_.find(sit_);
  bool found_memo_entry = memo_entry != memoized_evals_.end();
  if (found_memo_entry) {
    if (memo_entry->second.depth >= depth) {
      int memo_alpha_beta_flag = memo_entry->second.alpha_beta_flag;
      int memo_eval = memo_entry->second.eval;
      if (memo_alpha_beta_flag == kExactFlag) {
        return memo_eval;
      } else if (memo_alpha_beta_flag == kLowerboundFlag) {
        alpha = std::max(alpha, memo_eval);
      } else /*(memo_alpha_beta_flag == kUpperboundFlag)*/ {
        beta = std::min(beta, memo_eval);
      }
      if (alpha >= beta) {
        return memo_eval;
      }
    }
  }
  int eval = -2 * kInfinity;
  for (const ScoredMove& scored_move : OrderedMoves(depth - 1)) {
    const Move& move = scored_move.move;
    sit_.ApplyMove(move);
    eval = std::max(eval, -NegamaxEval(depth - 1, -beta, -alpha));
    sit_.UndoMove(move);
    alpha = std::max(alpha, eval);
    if (alpha >= beta) break;
  }
  int8_t alpha_beta_flag = kExactFlag;
  if (eval <= starting_alpha)
    alpha_beta_flag = kUpperboundFlag;
  else if (eval >= beta)
    alpha_beta_flag = kLowerboundFlag;
  if (found_memo_entry) {
    memo_entry->second.alpha_beta_flag = alpha_beta_flag;
    memo_entry->second.depth = static_cast<int8_t>(depth);
    memo_entry->second.eval = static_cast<int16_t>(eval);
  } else {
    memoized_evals_.insert({sit_,
                            {alpha_beta_flag, static_cast<int8_t>(depth),
                             static_cast<int16_t>(eval)}});
  }
  return eval;
}

Move Negamaxer::GetMove(Situation sit) {
  // Reset data structures and metrics.
  sit_ = sit;
  num_evals_ = 0;

  // Same loop as in `NegamaxEval()`, with the following differences:
  // - We need to keep track of the best move, not only its evaluation.
  // - Situations are not memoized, as they are evaluated exactly once since
  // this is the shallowest search depth.
  Move best_move;
  // `best_move_eval` is initialized to -2*kInfinity so that *some* move is
  // still chosen in the event that every move is losing, which are evaluated to
  // -kInfinity.
  int best_move_eval = -2 * kInfinity;
  int alpha = -2 * kInfinity;
  int beta = 2 * kInfinity;
  for (const ScoredMove& scored_move : OrderedMoves(kMaxDepth - 1)) {
    const Move& move = scored_move.move;
    sit_.ApplyMove(move);
    int move_eval = -NegamaxEval(kMaxDepth - 1, alpha, beta);
    sit_.UndoMove(move);
    if (move_eval > best_move_eval) {
      best_move = move;
      best_move_eval = move_eval;
      std::cerr << "Best move: " << sit_.MoveToString(move)
                << " (eval: " << best_move_eval << ")" << std::endl;
    } else if (move_eval == best_move_eval) {
      std::cerr << "Matching move: " << sit_.MoveToString(move)
                << " (eval: " << move_eval << ")" << std::endl;
    }
  }
  return best_move;
}

namespace {

// Given a list of nodes `node_list` and a set of nodes `node_set`, returns two
// nodes: (1) the first and last nodes in `node_list` that are in `node_set`, if
// any, or {-1, -1} otherwise. Assumes that all nodes in `node_list` in
// `node_set` are contiguous in `node_list`. There are 5 cases:
// 1. `node_list` and `node_set` are disjoint. Returns {-1, -1}.
// 2. `node_list` and `node_set` are not disjoint...
// 2.a) `node_set` does not contain s nor t. Returns {x, y}.
// 2.b) `node_set` contains s but not t. Returns {s, y}.
// 2.c) `node_set` contains t but not s. Returns {x, t}.
// 2.d) `node_set` contains s and t. Returns {s, t}.
// Where x and y are nodes in `node_list` (possibly the same, and possibly equal
// to s or t).
std::array<int, 2> FirstAndLastNodeInSet(
    const std::array<bool, kNumNodes>& node_set,
    const std::array<int, kNumNodes>& node_list) {
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

}  // namespace

nonstd::span<const ScoredMove> Negamaxer::OrderedMoves(int depth) {
  // The size is an upper bound on the number of possible
  // moves. There is one thread_local array for each depth of the negamax
  // search. The function returns a prefix of the array for the given `depth` as
  // a span, so that no copies or allocations of the arrays need to happen.
  thread_local std::array<std::array<ScoredMove, kMaxNumLegalMoves>, kMaxDepth>
      move_lists_all_depths;
  // `moves` is a reference to the array for the given `depth`. We will place
  // the moves in a prefix of `moves`.
  std::array<ScoredMove, kMaxNumLegalMoves>& moves =
      move_lists_all_depths[depth];
  // `move_index` is the first unused index in `moves`. It will advance for each
  // move generated. The function will return a span of `moves` from index 0 to
  // index `move_index`.
  int move_index = 0;

  // int8_t to int conversions.
  const std::array<int, 2> tokens = {sit_.tokens[0], sit_.tokens[1]};
  const int turn = sit_.turn;
  const int opp_turn = (turn == 0 ? 1 : 0);

  const std::array<std::array<int, kNumNodes>, 2> shortest_paths{
      sit_.G.ShortestPath(tokens[0], kGoals[0]),
      sit_.G.ShortestPath(tokens[1], kGoals[1])};

  const std::array<std::bitset<kNumRealAndFakeEdges>, 2> SP_edges{
      PathAsEdgeSet(shortest_paths[0]), PathAsEdgeSet(shortest_paths[1])};

  const std::bitset<kNumRealAndFakeEdges> bridges = sit_.G.Bridges();

  // A copy of the graph that we will modify, e.g., by pruning edges.
  Graph G_pruned = sit_.G;

  // Disable bridges not in the shortest paths. Such bridges lead to "useless
  // zones", regions of the board without any goal or player. Since the only way
  // to get out of a useless zone is by crossing the bridge to it again, it is
  // never beneficial for a player to cross such a bridge. Thus, we remove them
  // so that they are not considered later during move generation.
  for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
    if (bridges[edge] && !SP_edges[0][edge] && !SP_edges[1][edge]) {
      G_pruned.DeactivateEdge(edge);
    }
  }

  // Get rid of unreachable edges after removing the bridges to "useless zones".
  // Since it is never beneficial for a player to go to a useless zone, they
  // also do not have any reason to build a wall in one. Thus, we remove walls
  // in dead zones so that they are not considered during move generation.
  {
    const std::array<int, kNumNodes> connected_components =
        G_pruned.ConnectedComponents();
    const std::array<int, 2> token_CCs{connected_components[tokens[0]],
                                       connected_components[tokens[1]]};
    for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
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
  int opp_dist = G_pruned.Distance(tokens[opp_turn], kGoals[opp_turn]);

  // Label edges by 2-edge connected component, using -1 for bridges, and -2 for
  // disabled edges (i.e., fake edges, already-built walls, or pruned edges).
  std::array<int, kNumRealAndFakeEdges> edge_labels;
  edge_labels.fill(-2);
  {
    const std::array<int, kNumNodes> two_edge_connected_components =
        G_pruned.TwoEdgeConnectedComponents();
    for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
      if (bridges[edge])
        edge_labels[edge] = -1;
      else if (G_pruned.edges[edge]) {
        // Take an arbitrary endpoint of the edge and label the edge with the
        // node's 2-edge CC. We are using the fact that if `edge` is not a
        // bridge, then both endpoints are in the same 2-edge CC.
        int endpoint_2ecc = two_edge_connected_components[LowerEndpoint(edge)];
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
    // Note that this works in the edge case where every edge is a bridge, which
    // are labeled -1, so `num_labels` gets a value of 0.
    num_labels = max_label + 1;
  }

  // Generate double-walk moves and walk-and-build moves.
  {
    const std::array<int, kNumNodes> distances_from_goal =
        G_pruned.Distances(kGoals[turn]);

    // Generate double-walk moves. They are scored based on how much they reduce
    // the distance to the goal. Each one-step reduction gets a score of 10.
    // Thus, moves can have a score of -20, 0, or 20.
    for (int node : G_pruned.NodesAtDistance2(tokens[turn])) {
      if (node == -1) continue;
      if (distances_from_goal[node] == 0) {
        bool is_draw_by_one_move = turn == 0 && opp_dist <= 2;
        if (!is_draw_by_one_move) {
          // We found a winning move, so we can discard any previously generated
          // moves and return the single winning move.
          moves[0] = {DoubleWalkMove(tokens[turn], node), 1000};
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
    // wall that can be built, so p0 would want to be able to build it and walk
    // a single square.
    //      |  |
    // --+--+--+--
    //   |  |  |
    // --+--+--+--
    //   |  |  |
    // --+--+--+--
    // g1    p0 p1 (g0 is at the same cell as p1).
    int useless_edge = -1;
    for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
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
      const int walk_score =
          distances_from_goal[node] == 0 ? 1000 : 10 * dist_to_goal_reduction;

      // If we did not prune any edge in `G_pruned`, we would not have found a
      // useless edge yet. However, the edge crossed by the player to move to
      // `node` may become useless.
      int useless_edge_after_move = -1;
      if (useless_edge != -1) {
        useless_edge_after_move = useless_edge;
      } else {
        int candidate_useless_edge = EdgeBetweenNeighbors(tokens[turn], node);
        // `candidate_useless_edge` can be a useless edge if the move to `node`
        // turns it into a bridge to a "useless zone". The necessary and
        // sufficient conditions are: (i) `candidate_useless_edge` is a bridge;
        // (ii) `candidate_useless_edge` is not part of the shortest path of the
        // other player.
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
      // because it cannot build any wall. They are all bridges in the path from
      // a player to its goal.

      // Consider edges to build along with the move to `node`.
      for (int edge = 0; edge < kNumRealAndFakeEdges; edge++) {
        // Ignore disabled edges, except the useless edge.
        if (edge_labels[edge] == -2 && edge != useless_edge_after_move)
          continue;

        // Ignore bridges (since they can't be built, unless they became useless
        // due to the move)
        if (edge_labels[edge] == -1 && edge != useless_edge_after_move)
          continue;

        if (walk_score == 1000) {
          bool is_draw_by_one_move = turn == 0 && opp_dist <= 2;
          if (!is_draw_by_one_move) {
            // We found a winning move, so we can discard any previously
            // generated moves and return the single winning move.
            moves[0] = {WalkAndBuildMove(tokens[turn], node, edge), 1000};
            DBGS(sit_.CrashIfMoveIsIllegal(moves[0].move));
            return nonstd::span<const ScoredMove>(moves.begin(),
                                                  moves.begin() + 1);
          }
        }
        // We score walk-and-build moves as follows: if the wall is in the
        // shortest path of the opponent, it gets a bonus of +5. If it is in the
        // player's shortest path, it gets a penalty of -4. The bonuses and
        // penalties are added to the walk score. Thus, moves can have a score
        // of -14, -10, -9, -5, 6, 10, 11, or 15. (We could compute how much the
        // distance to the goal of each player actually changes due to building
        // the wall, but that would require 2 extra graph traversals.)
        const int wall_score = (SP_edges[turn][edge] ? -4 : 0) +
                               (SP_edges[opp_turn][edge] ? 5 : 0);
        moves[move_index++] = {WalkAndBuildMove(tokens[turn], node, edge),
                               walk_score + wall_score};
      }
    }
  }

  // Note: we could consider generating double-build moves with the useless edge
  // and a real edge. However, it's hard to imagine a situation where that would
  // be optimal.

  // Generate double-build moves consisting of edges in different
  // two-edge-connected components. These moves are cheap to generate since they
  // are always legal. We score each wall individually and add up their scores.
  // If the wall is in the shortest path of the opponent, it gets a bonus of +7.
  // If it is in the player's shortest path, it gets a penalty of -6. Thus,
  // moves can have a score of -12, -6, 0, 1, 7, or 14. (We could compute how
  // much the distance to the goal of each player actually changes due to
  // building the walls, but that would require 2 extra graph traversals.)
  for (int edge1 = 0; edge1 < kNumRealAndFakeEdges; ++edge1) {
    if (edge_labels[edge1] < 0) continue;  // Skip bridges and disabled edges.
    const int edge1_score =
        (SP_edges[turn][edge1] ? -6 : 0) + (SP_edges[opp_turn][edge1] ? 7 : 0);
    for (int edge2 = edge1 + 1; edge2 < kNumRealAndFakeEdges; ++edge2) {
      if (edge_labels[edge2] < 0 || edge_labels[edge1] == edge_labels[edge2])
        continue;
      const int edge2_score = (SP_edges[turn][edge2] ? -6 : 0) +
                              (SP_edges[opp_turn][edge2] ? 7 : 0);
      moves[move_index++] = {DoubleBuildMove(edge1, edge2),
                             edge1_score + edge2_score};
    }
  }

  // Generate double-build moves consisting of edges in the same
  // two-edge-connected components. These are the hardest ones to generate while
  // minimizing reachability computations.
  for (int label = 0; label < num_labels; ++label) {
    // The two-edge connected component with label `label`.
    Graph subgraph;
    for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
      if (edge_labels[edge] != label) subgraph.DeactivateEdge(edge);
    }

    // First and last node in each player's shortest path through the two-edge
    // connected component `subgraph`, or -1 if a player's shortest path
    // does not intersect the subgraph.
    // todo: can this be computed at the same time for all labels?
    std::array<std::array<int, 2>, 2> subgraph_starts_and_ends;
    {
      const std::array<bool, kNumNodes> subgraph_nodes = subgraph.ActiveNodes();
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
    std::array<std::bitset<kNumRealAndFakeEdges>, 2> MP_edges;
    // Alternative path edges. These paths are edge-disjoint with the main path
    // edges.
    std::array<std::bitset<kNumRealAndFakeEdges>, 2> AP_edges;

    for (int i = 0; i < 2; ++i) {
      if (subgraph_starts_and_ends[i][0] == -1) continue;
      const std::array<std::array<int, kNumNodes>, 2> edge_disjoint_paths =
          subgraph.TwoEdgeDisjointPaths(subgraph_starts_and_ends[i][0],
                                        subgraph_starts_and_ends[i][1]);
      MP_edges[i] = PathAsEdgeSet(edge_disjoint_paths[0]);
      AP_edges[i] = PathAsEdgeSet(edge_disjoint_paths[1]);
    }

    // Finally, we consider every pair of edge in the subgraph.
    for (int edge1 = 0; edge1 < kNumRealAndFakeEdges; ++edge1) {
      if (edge_labels[edge1] != label) continue;
      for (int edge2 = edge1 + 1; edge2 < kNumRealAndFakeEdges; ++edge2) {
        if (edge_labels[edge2] != label) continue;
        // `subgraph_distances_after_build` stores the distance for each player
        // to cross `subgraph` after building the walls `edge1` and `edge2`. We
        // do not always need to compute those distances, in which case
        // `subgraph_distances_after_build` may contain the invalid distance
        // -2.
        std::array<int, 2> subgraph_distances_after_build = {-2, -2};
        for (int i = 0; i < 2; i++) {
          if ((MP_edges[i][edge1] && AP_edges[i][edge2]) ||
              (MP_edges[i][edge2] && AP_edges[i][edge1])) {
            // edge1 and edge2 may block player i's path. We need to check.
            auto subgraph_copy = subgraph;
            subgraph_copy.DeactivateEdge(edge1);
            subgraph_copy.DeactivateEdge(edge2);
            subgraph_distances_after_build[i] = subgraph_copy.Distance(
                subgraph_starts_and_ends[i][0], subgraph_starts_and_ends[i][1]);
            // The move is illegal -- no need to check if the other player can
            // reach the player.
            if (subgraph_distances_after_build[i] == -1) break;
          }
        }

        if (subgraph_distances_after_build[0] == -1 ||
            subgraph_distances_after_build[1] == -1) {
          // The move is illegal because it disconnects a player from its
          // goal.
          continue;
        }
        // The move is legal. We score it as follows:
        int score = 0;

        // If we computed the distance after build of the player, we give a
        // 10 point penalty for each distance increase.
        if (subgraph_distances_after_build[turn] != -2) {
          const int dist_to_goal_increase =
              subgraph_distances_after_build[turn] - subgraph_distances[turn];
          score -= 10 * dist_to_goal_increase;
        }

        // If we computed the distance after build of the opponent, we give a
        // 10 point bonus for each distance increase.
        if (subgraph_distances_after_build[opp_turn] != -2) {
          const int opp_dist_to_goal_increase =
              subgraph_distances_after_build[opp_turn] -
              subgraph_distances[opp_turn];
          score += 10 * opp_dist_to_goal_increase;
        }

        // Given a penalty if the walls block the player's paths. The penalty is
        // most severe if it blocks both the main and alternative paths.
        if ((MP_edges[turn][edge1] && AP_edges[turn][edge2]) ||
            (MP_edges[turn][edge2] && AP_edges[turn][edge1])) {
          score -= 9;
        } else if (MP_edges[turn][edge1] || MP_edges[turn][edge2]) {
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
    sit_.CrashIfMoveIsIllegal(scored_move.move);
  });
  return nonstd::span<const ScoredMove>(moves.begin(),
                                        moves.begin() + move_index);
}
