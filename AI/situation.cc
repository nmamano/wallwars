#include "situation.h"

#include <array>
#include <cassert>
#include <iostream>
#include <vector>

#include "graph.h"

namespace {

constexpr std::array<int, 2> InitialTokens() {
  return {TopLeftNode(), TopRightNode()};
}

}  // namespace

Situation::Situation() : tokens(InitialTokens()) {}

void Situation::ApplyMove(Move move) {
  for (int edge : move.edges) {
    if (edge != -1) {
      assert(IsRealEdge(edge) && G.edges[edge]);
      G.DeactivateEdge(edge);
    }
  }
  tokens[turn] += move.token_change;
  assert(tokens[turn] >= 0 && tokens[turn] < NumNodes());
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
  tokens[turn] -= move.token_change;
  assert(tokens[turn] >= 0 && tokens[turn] < NumNodes());
}

bool Situation::CanDeactivateEdge(int edge) /*const*/ {
  if (!G.edges[edge]) return false;  // Already inactive.
  G.DeactivateEdge(edge);
  bool players_can_reach_goals = CanPlayersReachGoals();
  G.ActivateEdge(edge);
  return players_can_reach_goals;
}

std::vector<Move> Situation::AllLegalMoves() /*const*/ {
  std::vector<Move> moves;
  int curr_node = tokens[turn];
  auto dist = G.Distances(curr_node);

  // Moves with 2 token moves. At most 8.
  for (int node = 0; node < NumNodes(); ++node) {
    if (dist[node] == 2) {
      moves.push_back({node - curr_node, {-1, -1}});
    }
  }

  // Moves with 1 token move and 1 edge removal. At most 4 * num_edges.
  for (int node = 0; node < NumNodes(); ++node) {
    if (dist[node] == 1) {
      tokens[turn] = node;
      for (int edge = 0; edge < NumRealAndFakeEdges(); ++edge) {
        if (IsRealEdge(edge) && CanDeactivateEdge(edge)) {
          moves.push_back({node - curr_node, {edge, -1}});
        }
      }
    }
  }
  tokens[turn] = curr_node;

  // Moves with 2 edge removals. At most num_edges * num_edges.
  for (int edge1 = 0; edge1 < NumRealAndFakeEdges(); ++edge1) {
    if (IsRealEdge(edge1) && CanDeactivateEdge(edge1)) {
      G.DeactivateEdge(edge1);
      for (int edge2 = edge1 + 1; edge2 < NumRealAndFakeEdges(); ++edge2) {
        if (IsRealEdge(edge2) && CanDeactivateEdge(edge2)) {
          moves.push_back({0, {edge1, edge2}});
        }
      }
      G.ActivateEdge(edge1);
    }
  }
  return moves;
}

void Situation::PrettyPrint() const {
  int p0 = tokens[0], p1 = tokens[1];
  int g0 = kGoals[0], g1 = kGoals[1];
  for (int row = 0; row < kNumRows; ++row) {
    // One line for cells and horizontal edges.
    for (int col = 0; col < kNumCols; ++col) {
      int node = NodeAtCoordinates(row, col);
      std::string node_str;
      if (p0 == node && p1 == node)
        node_str = "01";
      else if (p0 == node && (g0 == node || g1 == node))
        node_str = "0*";
      else if (p1 == node && (g0 == node || g1 == node))
        node_str = "*1";
      else if (p0 == node)
        node_str = "0 ";
      else if (p1 == node)
        node_str = " 1";
      else if (g0 == node || g1 == node)
        node_str = "**";
      else
        node_str = "  ";
      std::cout << node_str;

      // Horizontal edge to the right.
      if (col < kNumCols - 1) {
        std::cout << (G.edges[EdgeRight(node)] ? " " : "|");
      } else {
        std::cout << std::endl;
      }
    }
    // One line for vertical edges and pillars between 4 walls.
    if (row == kNumRows - 1) continue;
    for (int col = 0; col < kNumCols; ++col) {
      int node = NodeAtCoordinates(row, col);
      std::cout << (G.edges[EdgeBelow(node)] ? "  " : "--");
      // "Pillar" between 4 walls.
      if (col < kNumCols - 1) {
        std::cout << "+";
      }
    }
    std::cout << std::endl;
  }
}