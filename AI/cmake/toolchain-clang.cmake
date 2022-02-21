set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic -Xclang --dependent-lib=msvcrt")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -Ofast -march=haswell -flto=full -Xclang --dependent-lib=msvcrt")

# `-Xclang --dependent-lib=msvcrt` forces using Microsoft's standard library,
# which normally should be detected automatically, but it doesn't in my system.
# Probably needs to be remove to run in other systems.

