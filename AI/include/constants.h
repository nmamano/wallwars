#ifndef CONSTANTS_H_
#define CONSTANTS_H_

namespace wallwars {

// Search depth of the Negamax AI.
constexpr int kMaxDepth = 20;

// Space allocated for the transposition table.
constexpr long long kTranspositionTableBytes = 10 * 1024 * 1024;

// Indicate whether the AI should indicate alternative moves that are as good as
// the found move.
constexpr bool kShowMatchingMoves = false;

// If set to false, the compiler can omit the code to track performance metrics.
constexpr bool kBenchmark = true;

constexpr int kInteractiveGameR = 8;
constexpr int kInteractiveGameC = 8;
constexpr int kInteractiveGameMillis = 20000;
// Uncomment to avoid compiling the tests. This can speed up compilation.
// #define NTEST

constexpr int kNumBenchmarkSamples = 2;

}  // namespace wallwars

#endif  // CONSTANTS_H_