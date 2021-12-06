#include "negamaxer.h"

#include <array>
#include <iostream>
#include <vector>

#include "external/span.h"
#include "graph.h"
#include "io.h"
#include "macros.h"
#include "situation.h"

namespace {

constexpr int kMaxDepth = 4;
constexpr int kInfinity = 999;  // Larger than any real evaluation.

}  // namespace

int Negamaxer::DirectEval() const {
  return sit_.G.Distance(sit_.tokens[1], kGoals[1]) -
         sit_.G.Distance(sit_.tokens[0], kGoals[0]);
}

int Negamaxer::NegamaxEval(int depth) {
  ++num_explored_situations_;
  if (num_explored_situations_ % 1000000 == 0) std::cerr << ".";
  if (sit_.IsGameOver()) {
    return sit_.Winner() == sit_.turn ? kInfinity : -kInfinity;
  }
  if (depth == 0) {
    return (sit_.turn == 0 ? 1 : -1) * DirectEval();
  }
  int eval = -kInfinity;
  for (Move move : AllLegalMovesOpt(depth - 1)) {
    sit_.ApplyMove(move);
    eval = std::max(eval, -NegamaxEval(depth - 1));
    sit_.UndoMove(move);
  }
  return eval;
}

Move Negamaxer::GetMove(Situation sit) {
  sit_ = sit;
  Move best_move;
  int best_move_eval = -kInfinity - 1;
  for (Move move : AllLegalMovesOpt(kMaxDepth - 1)) {
    sit_.ApplyMove(move);
    int move_eval = -NegamaxEval(kMaxDepth - 1);
    sit_.UndoMove(move);
    if (move_eval > best_move_eval) {
      best_move = move;
      best_move_eval = move_eval;
      std::cerr << "Found better move: " << best_move
                << " (eval: " << best_move_eval << ")" << std::endl;
    }
  }
  DUMP(best_move);
  DUMP(best_move_eval);
  DUMP(num_explored_situations_);
  return best_move;
}

// Optimized version of Situation::AllLegalMoves to avoid allocating space for
// the moves each time. Note: calls with a given `depth` value erase the
// returned for previous calls for the same `depth`.
nonstd::span<const Move> Negamaxer::AllLegalMovesOpt(int depth) /*const*/ {
  // Not thread-safe. The size is an upper bound on the number of possible
  // moves. There is one array for each depth of the negamax search.
  static std::array<std::array<Move, kMaxNumLegalMoves>, kMaxDepth>
      move_lists_all_depths;
  std::array<Move, kMaxNumLegalMoves>& moves = move_lists_all_depths[depth];

  int move_index = 0;
  int curr_node = sit_.tokens[sit_.turn];
  auto dist = sit_.G.Distances(curr_node);

  // Moves with 2 token moves. At most 8.
  for (int node = 0; node < NumNodes(); ++node) {
    if (dist[node] == 2) {
      moves[move_index++] = {node - curr_node, {-1, -1}};
    }
  }

  // Moves with 1 token move and 1 edge removal. At most 4 * num_edges.
  for (int node = 0; node < NumNodes(); ++node) {
    if (dist[node] == 1) {
      sit_.tokens[sit_.turn] = node;
      for (int edge = 0; edge < NumRealAndFakeEdges(); ++edge) {
        if (IsRealEdge(edge) && sit_.CanDeactivateEdge(edge)) {
          moves[move_index++] = {node - curr_node, {edge, -1}};
        }
      }
    }
  }
  sit_.tokens[sit_.turn] = curr_node;

  // Moves with 2 edge removals. At most num_edges * num_edges.
  for (int edge1 = 0; edge1 < NumRealAndFakeEdges(); ++edge1) {
    if (IsRealEdge(edge1) && sit_.CanDeactivateEdge(edge1)) {
      sit_.G.DeactivateEdge(edge1);
      for (int edge2 = edge1 + 1; edge2 < NumRealAndFakeEdges(); ++edge2) {
        if (IsRealEdge(edge2) && sit_.CanDeactivateEdge(edge2)) {
          moves[move_index++] = {0, {edge1, edge2}};
        }
      }
      sit_.G.ActivateEdge(edge1);
    }
  }
  return nonstd::span<const Move>(moves.begin(), moves.begin() + move_index);
}
