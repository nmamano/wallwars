cmake_minimum_required(VERSION 3.19)
project(WallwarsAI LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_EXTENSIONS OFF)

include_directories("include")
include_directories(SYSTEM "external")

add_executable(wallwars_ai
    # Sources (yes you can detect these automatically but you're supposed not to for reasons...)
    "source/main.cc"

    # Headers (not necessary, but helpful for IDEs like VS)
    "include/benchmark_metrics.h"
    "include/benchmark.h"
    "include/constants.h"
    "include/graph.h"
    "include/macro_utils.h"
    "include/move.h"
    "include/negamax.h"
    "include/situation.h"
    "include/utils.h"
    "include/interactive_game.h"
    "include/tests.h"

    # External headers (see above)
    "include/external/span.h"
)
