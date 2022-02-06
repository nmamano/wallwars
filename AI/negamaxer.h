#ifndef NEGAMAXER_H_
#define NEGAMAXER_H_

#include <unordered_map>

#include "constants.h"
#include "external/span.h"
#include "move.h"
#include "mover.h"
#include "situation.h"

class Negamaxer : public Mover {
 public:
  Move GetMove(Situation sit) override;

 private:
  // Evaluates situation `sit_` with the Negamax algorithm, exploring `depth`
  // moves ahead. Higher is better for the player to move.
  int NegamaxEval(int depth, int alpha, int beta);

  // Evaluates situation `sit_` with the formula dist(p1, g1) - dist(p0, g0).
  // Higher is better for P0.
  inline int DirectEval() const;

  // Returns a list of legal moves ordered heuristically from best to worst
  // while trying to minimize the number of graph operations (distance
  // computations, reachability checks, etc.). It might not return every legal
  // move; it excludes moves that are provably suboptimal. Note: calls with a
  // given `depth` value overwrites the output returned for previous calls for
  // the same `depth`.
  nonstd::span<const ScoredMove> OrderedMoves(int depth);

  // The situation that moves are applied to to traverse the search tree.
  Situation sit_;

  // Values of the memoization table. Designed to fit in one 32-bit word.
  struct MemoizedEval {
    // Indicates if the evaluation is exact, a lower bound, or an upper bound.
    // See the flag constants in `negamaxer.cc`.
    int8_t alpha_beta_flag;
    // Depth of the eval. Higher (shallower) depths are based on a longer
    // lookahead, so they can be used for lower depths too. Depths up to 127 are
    // possible.
    int8_t depth;
    // Eval of a position. Evals with absolute value up to 32767 are possible.
    int16_t eval;
  };
  std::unordered_map<Situation, MemoizedEval, SituationHash> memoized_evals_;

  // Gets reset when calling GetMove.
  int num_evals_ = 0;

  friend void RunBenchmark();
  friend bool NegamaxerOrderedMovesTest();
};

#endif  // NEGAMAXER_H_