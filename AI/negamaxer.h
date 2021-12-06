#ifndef NEGAMAXER_H_
#define NEGAMAXER_H_

#include "external/span.h"
#include "mover.h"
#include "situation.h"

class Negamaxer : public Mover {
 public:
  Move GetMove(Situation sit) override;

 private:
  // Evaluates situation `sit_` with the Negamax algorithm, exploring `depth`
  // moves ahead. Higher is better for the player to move.
  int NegamaxEval(int depth);

  // Evaluates situation `sit_` with the formula dist(p1, g1) - dist(p0, g0).
  // Higher is better for P0.
  inline int DirectEval() const;

  Situation sit_;
  int num_explored_situations_ = 0;

  // Optimized version of Situation::AllLegalMoves to avoid allocating space for
  // the moves each time. Note: calls with a given `depth` value overwrites the
  // output returned for previous calls for the same `depth`.
  nonstd::span<const Move> AllLegalMovesOpt(int depth);
};

#endif  // NEGAMAXER_H_