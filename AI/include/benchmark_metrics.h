#ifndef BENCHMARK_METRICS_H_
#define BENCHMARK_METRICS_H_

#include <array>

#include "constants.h"

namespace wallwars {

constexpr int kNumExitTypes = 5;
constexpr int NORMAL_EXIT = 0;
constexpr int LEAF_EVAL_EXIT = 1;
constexpr int TABLE_HIT_EXIT = 2;
constexpr int TABLE_CUTOFF_EXIT = 3;
constexpr int GAME_OVER_EXIT = 4;

struct BenchmarkMetrics {
  long long wall_clock_time_ms = 0;

  // A metric to measure the efficiency of the AI in terms of graph traversals.
  // By graph traversal, we mean an operation that takes linear time on the size
  // of the graph, such as computing the distance between two nodes.
  long long num_graph_primitives = 0;

  // Keep a counter for each possible exit out of the searsch function.
  // The first dimension is the depth. The second dimension is the type of exit.
  std::array<std::array<long long, kNumExitTypes>, kMaxDepth + 1> num_exits;

  std::array<long long, kMaxDepth + 1> table_bound_improvement;
  // The situation was in the table, but it did not improve the existing
  // alpha-beta bounds.
  std::array<long long, kMaxDepth + 1> table_useless_hit;

  // A hit is when the evaluation of a position can be returned immediately. A
  // partial hit is when the alpha or beta bounds can be improved. A cutoff is
  // when the improved bounds from a partial hit result in an alpha-beta cutoff.
  std::array<long long, kMaxDepth + 1> transposition_table_insertions;

  // A displacement happens when we would like to keep two entries, but we can
  // only keep one.
  std::array<long long, kMaxDepth + 1> transposition_table_displacements;

  // A children is generated if it is created and stored in memory. It does not
  // need to be visited recursively to count as generated.
  std::array<long long, kMaxDepth + 1> num_generated_children;

  // std::array<double, kMaxDepth + 1> wall_clock_time_by_ID_iteration;
};

// Global object.
BenchmarkMetrics benchmark_metrics;

#define METRIC_INC(metric)      \
  if (kBenchmark) {             \
    ++benchmark_metrics.metric; \
  }

}  // namespace wallwars

#endif  // BENCHMARK_METRICS_H_
