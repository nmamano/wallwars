#include <emscripten/emscripten.h>

#include <string>

#include "../../AI/include/move.h"
#include "../../AI/include/negamax.h"
#include "../../AI/include/situation.h"

// C-API to be used in JS via the emscripten pipeline.
extern "C" {

EMSCRIPTEN_KEEPALIVE char const* GetMove(char const* standard_notation) {
  char* c;
  {
    wallwars::Situation<wallwars::kBrowserR, wallwars::kBrowserC> sit =
        wallwars::ParseSituationOrCrash<wallwars::kBrowserR,
                                        wallwars::kBrowserC>(standard_notation);
    wallwars::Negamax<wallwars::kBrowserR, wallwars::kBrowserC> negamax;
    // Expects that the game is not over, i.e., no player is at their goal.
    wallwars::Move move = negamax.GetMove(sit, wallwars::kBrowserMillis);
    std::string move_str = sit.MoveToStandardNotation(move);
    c = strdup(move_str.c_str());
  }
  return c;
}
}
