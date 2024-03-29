#ifndef CONSTANTS_H_
#define CONSTANTS_H_

namespace wallwars {

// Search depth of the Negamax AI.
constexpr int kMaxDepth = 20;

// Space allocated for the transposition table in mega bytes.
constexpr int kTranspositionTableMB = 512;

constexpr int kInteractiveGameR = 8;
constexpr int kInteractiveGameC = 8;
constexpr int kInteractiveGameMillis = 20000;

// If set to false, the compiler can omit the code to track performance metrics.
constexpr bool kBenchmark = true;

constexpr int kBenchmarkNumSamples = 2;
constexpr int kBenchmarksearchTimeMillis = 10000;

constexpr int kBrowserR = 7;
constexpr int kBrowserC = 7;
constexpr int kBrowserMillis = 4000;

}  // namespace wallwars

#endif  // CONSTANTS_H_