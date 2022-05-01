#include <emscripten/emscripten.h>

#include <string>

#include "../../AI/include/move.h"
#include "../../AI/include/negamax.h"
#include "../../AI/include/situation.h"

// C-API to be used in JS via the emscripten pipeline.
extern "C" {

EMSCRIPTEN_KEEPALIVE char const* GetMove8x8(char const* standard_notation) {
  wallwars::Situation<kBrowserR, kBrowserC> sit =
      wallwars::ParseSituationOrCrash<kBrowserR, kBrowserC>(standard_notation);
  wallwars::Negamax<kBrowserR, kBrowserC> negamax;
  // Expects that the game is not over, i.e., no player is at their goal.
  wallwars::Move move = negamax.GetMove(sit, kBrowserSearchTimeMillis);
  std::string move_str = sit.MoveToStandardNotation(move);
  char* c = strdup(move_str.c_str());
  return c;
}
}
