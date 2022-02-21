set(CMAKE_C_COMPILER clang)
set(CMAKE_CXX_COMPILER clang++)

# Runs the CLANG static analyzer. This is slower than normal compilation and does not actually produce an executable, but it outputs useful warnings.
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic -Xclang --dependent-lib=msvcrt --analyze")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -Ofast -march=haswell -flto=full -Xclang --dependent-lib=msvcrt --analyze")
