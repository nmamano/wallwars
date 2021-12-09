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
    return sit_.Winner() == sit_.turn ? kInfinity : -kInfinity;
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
  int eval = -kInfinity;
  for (Move move : AllLegalMovesOpt(depth - 1)) {
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
  // `best_move_eval` is initialized to -kInfinity - 1 so that *some* move is
  // still chosen in the event that every move is losing, which are evaluated to
  // -kInfinity.
  int best_move_eval = -kInfinity - 1;
  for (Move move : AllLegalMovesOpt(kMaxDepth - 1)) {
    sit_.ApplyMove(move);
    int move_eval = -NegamaxEval(kMaxDepth - 1, -kInfinity, kInfinity);
    sit_.UndoMove(move);
    if (move_eval > best_move_eval) {
      best_move = move;
      best_move_eval = move_eval;
      std::cerr << "Best move: " << sit_.MoveAsPrettyString(move)
                << " (eval: " << best_move_eval << ")" << std::endl;
    }
  }
  if (best_move_eval == -kInfinity) {
    // Special "no-op" move that denotes resignation.
    return {0, {-1, -1}};
  }
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
      sit_.tokens[sit_.turn] = static_cast<int8_t>(node);
      for (int edge = 0; edge < NumRealAndFakeEdges(); ++edge) {
        if (IsRealEdge(edge) && sit_.CanDeactivateEdge(edge)) {
          moves[move_index++] = {node - curr_node, {edge, -1}};
        }
      }
    }
  }
  sit_.tokens[sit_.turn] = static_cast<int8_t>(curr_node);

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
