#include <emscripten/emscripten.h>

#include <string>

#include "../../AI/include/move.h"
#include "../../AI/include/negamax.h"
#include "../../AI/include/situation.h"

// C-API to be used in JS via the emscripten pipeline.
extern "C" {

EMSCRIPTEN_KEEPALIVE char const* GetMove8x8(char const* standard_notation) {
  wallwars::Situation<8, 8> sit =
      wallwars::ParseSituationOrCrash<8, 8>(standard_notation);
  wallwars::Negamax<8, 8> negamax;
  // Expects that the game is not over, i.e., no player is at their goal.
  wallwars::Move move = negamax.GetMove(sit, 5000);
  std::string move_str = sit.MoveToStandardNotation(move);
  return move_str.c_str();
}
}
