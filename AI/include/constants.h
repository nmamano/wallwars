#ifndef CONSTANTS_H_
#define CONSTANTS_H_

// Search depth of the Negamax AI.
constexpr int kMaxDepth = 2;

// Indicate whether the AI should indicate alternative moves that are as good as
// the found move.
constexpr bool kShowMatchingMoves = false;

// If set to false, the compiler can omit the code to track performance metrics.
constexpr bool kBenchmark = true;

constexpr int kInteractiveGameR = 4;
constexpr int kInteractiveGameC = 4;

// Uncomment to avoid compiling the tests. This can speed up compilation.
// #define NTEST

#endif  // CONSTANTS_H_