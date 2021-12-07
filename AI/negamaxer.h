#ifndef NEGAMAXER_H_
#define NEGAMAXER_H_

#include "external/span.h"
#include "mover.h"
#include "situation.h"

constexpr int kMaxDepth = 3;
class Negamaxer : public Mover {
 public:
  Move GetMove(Situation sit) override;

  inline int GetNumGameOverEvals() { return num_game_over_evals_; }
  inline int GetNumDirectEvals() { return num_direct_evals_; }
  inline int GetNumRecursiveEvals() { return num_recursive_evals_; }

 private:
  // Evaluates situation `sit_` with the Negamax algorithm, exploring `depth`
  // moves ahead. Higher is better for the player to move.
  int NegamaxEval(int depth);

  // Evaluates situation `sit_` with the formula dist(p1, g1) - dist(p0, g0).
  // Higher is better for P0.
  inline int DirectEval() const;

  Situation sit_;

  // Optimized version of Situation::AllLegalMoves to avoid allocating space for
  // the moves each time. Note: calls with a given `depth` value overwrites the
  // output returned for previous calls for the same `depth`.
  nonstd::span<const Move> AllLegalMovesOpt(int depth);

  // Search metrics.
  int num_game_over_evals_ = 0;
  int num_direct_evals_ = 0;
  int num_recursive_evals_ = 0;
};

#endif  // NEGAMAXER_H_