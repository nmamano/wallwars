cmake_minimum_required(VERSION 3.11)
project(WallwarsAI LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_EXTENSIONS OFF)

include_directories("include")
include_directories(SYSTEM "external")

add_executable(wallwars_ai
    # Sources (yes you can detect these automatically but you're supposed not to for reasons...)
    "source/benchmark.cc"
    "source/board_io.cc"
    "source/graph.cc"
    "source/human.cc"
    "source/main.cc"
    "source/negamaxer.cc"
    "source/situation.cc"
    "source/tests.cc"
    "source/walker.cc"

    # Headers (not necessary, but helpful for IDEs like VS)
    "include/benchmark.h"
    "include/board_io.h"
    "include/constants.h"
    "include/graph.h"
    "include/human.h"
    "include/macros.h"
    "include/move.h"
    "include/mover.h"
    "include/negamaxer.h"
    "include/situation.h"
    "include/template_utils.h"
    "include/tests.h"
    "include/walker.h"

    # External headers (see above)
    "include/external/span.h"
)
