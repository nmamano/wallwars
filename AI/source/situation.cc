#include "situation.h"

#include <array>
#include <cassert>
#include <cstdlib>
#include <iostream>
#include <vector>

#include "constants.h"
#include "graph.h"
#include "macros.h"

Situation::Situation()
    : tokens(
          {static_cast<int8_t>(kStarts[0]), static_cast<int8_t>(kStarts[1])}) {}

void Situation::ApplyMove(Move move) {
  DBGS(CrashIfMoveIsIllegal(move));
  for (int edge : move.edges) {
    if (edge != -1) {
      G.DeactivateEdge(edge);
    }
  }
  tokens[turn] = static_cast<int8_t>(tokens[turn] + move.token_change);
  FlipTurn();
}

void Situation::UndoMove(Move move) {
  FlipTurn();
  for (int edge : move.edges) {
    if (edge != -1) {
      assert(IsRealEdge(edge) && !G.edges[edge]);
      G.ActivateEdge(edge);
    }
  }
  tokens[turn] = static_cast<int8_t>(tokens[turn] - move.token_change);
  DBGS(CrashIfMoveIsIllegal(move));
}

bool Situation::CanDeactivateEdge(int edge) const {
  if (!G.edges[edge]) return false;  // Already inactive.
  auto clone = *this;
  clone.G.DeactivateEdge(edge);
  bool players_can_reach_goals = clone.CanPlayersReachGoals();
  return players_can_reach_goals;
}

bool Situation::IsLegalMove(Move move) const {
  // Check that walls are not fake or already present.
  for (int edge : move.edges) {
    if (edge == -1) continue;
    if (!IsRealEdge(edge) || !G.edges[edge]) return false;
  }
  // Check that there is the correct number of actions.
  int src = tokens[turn];
  int dst = src + move.token_change;
  if (dst < 0 || dst >= kNumNodes) return false;
  int token_move_actions = G.Distance(src, dst);
  int build_actions = 0;
  for (int edge : move.edges) {
    if (edge != -1) ++build_actions;
  }
  if (build_actions + token_move_actions != 2) {
    return false;
  }
  // Check that player-goal paths are not blocked by new walls.
  if (build_actions == 0) {
    return true;
  }
  auto clone = *this;
  if (build_actions == 1) {
    clone.tokens[turn] = static_cast<int8_t>(dst);
    for (int edge : move.edges) {
      if (edge != -1 && !clone.CanDeactivateEdge(edge)) return false;
    }
    return true;
  }
  // Case: build_actions == 2
  for (int edge : move.edges) {
    clone.G.DeactivateEdge(edge);
  }
  return clone.CanPlayersReachGoals();
}

void Situation::CrashIfMoveIsIllegal(Move move) const {
  if (IsLegalMove(move)) return;
  LOG("Illegal move");
  PrettyPrint();
  LOGV(move);
  int src = tokens[turn];
  int dst = src + move.token_change;
  LOGV3(src, dst, G.Distance(src, dst));
  for (int edge : move.edges) {
    if (edge == -1) continue;
    LOGV(edge);
    LOGV2(IsRealEdge(edge), G.edges[edge]);
  }
  std::exit(EXIT_FAILURE);
}

std::vector<Move> Situation::AllLegalMoves() const {
  Situation clone = *this;
  std::vector<Move> moves;
  int curr_node = tokens[turn];
  auto dist = G.Distances(curr_node);

  // Moves with 2 token moves. At most 8.
  for (int node = 0; node < kNumNodes; ++node) {
    if (dist[node] == 2) {
      moves.push_back(DoubleWalkMove(curr_node, node));
    }
  }

  // Moves with 1 token move and 1 edge removal. At most 4 * num_edges.
  for (int node = 0; node < kNumNodes; ++node) {
    if (dist[node] == 1) {
      clone.tokens[turn] = static_cast<int8_t>(node);
      for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
        if (IsRealEdge(edge) && clone.CanDeactivateEdge(edge)) {
          moves.push_back(WalkAndBuildMove(curr_node, node, edge));
        }
      }
    }
  }
  clone.tokens[turn] = static_cast<int8_t>(curr_node);

  // Moves with 2 edge removals. At most num_edges * num_edges.
  for (int edge1 = 0; edge1 < kNumRealAndFakeEdges; ++edge1) {
    if (IsRealEdge(edge1) && CanDeactivateEdge(edge1)) {
      clone.G.DeactivateEdge(edge1);
      for (int edge2 = edge1 + 1; edge2 < kNumRealAndFakeEdges; ++edge2) {
        if (IsRealEdge(edge2) && clone.CanDeactivateEdge(edge2)) {
          moves.push_back(DoubleBuildMove(edge1, edge2));
        }
      }
      clone.G.ActivateEdge(edge1);
    }
  }
  return moves;
}

std::string Situation::MoveToString(Move move) const {
  int start_node = TokenToMove();
  int end_node = start_node + move.token_change;
  std::string dir;
  if (NodeAbove(start_node) == end_node) dir = "N";
  if (NodeRight(start_node) == end_node) dir = "E";
  if (NodeBelow(start_node) == end_node) dir = "S";
  if (NodeLeft(start_node) == end_node) dir = "W";
  // In the case of a double token-move we need to find an ordering that makes
  // sense for the current enabled edges. That is, NE may be valid but EN may
  // not be.
  if (G.NeighborAbove(start_node) != -1) {
    int node_above = NodeAbove(start_node);
    if (G.NeighborAbove(node_above) == end_node) dir = "NN";
    if (G.NeighborRight(node_above) == end_node) dir = "NE";
    if (G.NeighborLeft(node_above) == end_node) dir = "NW";
  }
  if (G.NeighborRight(start_node) != -1) {
    int node_right = NodeRight(start_node);
    if (G.NeighborAbove(node_right) == end_node) dir = "EN";
    if (G.NeighborRight(node_right) == end_node) dir = "EE";
    if (G.NeighborBelow(node_right) == end_node) dir = "ES";
  }
  if (G.NeighborBelow(start_node) != -1) {
    int node_below = NodeBelow(start_node);
    if (G.NeighborRight(node_below) == end_node) dir = "SE";
    if (G.NeighborBelow(node_below) == end_node) dir = "SS";
    if (G.NeighborLeft(node_below) == end_node) dir = "SW";
  }
  if (G.NeighborLeft(start_node) != -1) {
    int node_left = NodeLeft(start_node);
    if (G.NeighborAbove(node_left) == end_node) dir = "WN";
    if (G.NeighborBelow(node_left) == end_node) dir = "WS";
    if (G.NeighborLeft(node_left) == end_node) dir = "WW";
  }
  std::string move_str = dir;
  for (int edge : move.edges) {
    if (edge != -1) {
      if (!move_str.empty()) move_str += " ";
      move_str += std::to_string(edge);
    }
  }
  return "(" + move_str + ")";
}

std::string Situation::AsPrettyString() const {
  return "Turn: " + std::to_string(static_cast<int>(turn)) + "\n" +
         G.AsPrettyString(tokens[0], tokens[1], '0', '1');
}

void Situation::PrettyPrint() const { std::cout << AsPrettyString(); }
