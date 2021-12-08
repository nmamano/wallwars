#ifndef NEGAMAXER_H_
#define NEGAMAXER_H_

#include <unordered_map>

#include "external/span.h"
#include "mover.h"
#include "situation.h"

constexpr int kMaxDepth = 4;
class Negamaxer : public Mover {
 public:
  Move GetMove(Situation sit) override;

  // Methods to get metrics about the search. The metrics are reset each time
  // `GetMove()` is called.
  inline int GetNumGameOverEvals() const { return num_game_over_evals_; }
  inline int GetNumDirectEvals() const { return num_direct_evals_; }
  inline int GetNumMemoizedEvals() const { return num_memoized_evals_; }
  inline int GetNumRecursiveEvals() const { return num_recursive_evals_; }
  inline int GetNumEvals() const {
    return num_game_over_evals_ + num_direct_evals_ + num_memoized_evals_ +
           num_recursive_evals_;
  }
  int GetNumMemoizedSituations() const;
  void PrintMetrics() const;

 private:
  // Evaluates situation `sit_` with the Negamax algorithm, exploring `depth`
  // moves ahead. Higher is better for the player to move.
  int NegamaxEval(int depth);

  // Evaluates situation `sit_` with the formula dist(p1, g1) - dist(p0, g0).
  // Higher is better for P0.
  inline int DirectEval() const;

  // Optimized version of Situation::AllLegalMoves to avoid allocating space for
  // the moves each time. Note: calls with a given `depth` value overwrites the
  // output returned for previous calls for the same `depth`.
  nonstd::span<const Move> AllLegalMovesOpt(int depth);

  // The situation that moves are applied to to traverse the search tree.
  Situation sit_;

  // Memoization table. There is one hash table for each depth.
  std::array<std::unordered_map<Situation, int, SituationHash>, kMaxDepth>
      memoized_evals;

  // Search metrics.
  int num_game_over_evals_ = 0;
  int num_direct_evals_ = 0;
  int num_memoized_evals_ = 0;
  int num_recursive_evals_ = 0;
};

#endif  // NEGAMAXER_H_