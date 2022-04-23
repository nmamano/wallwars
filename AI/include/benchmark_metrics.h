#ifndef BENCHMARK_METRICS_H_
#define BENCHMARK_METRICS_H_

#include <array>

#include "constants.h"

namespace wallwars {

// The following arrays may be used for array indexing, so we rely on the
// automatic assignment to integers starting at 0.

// The set of ways in which the AI can exit (return from) the search function.
enum Exits {
  REC_EVAL_EXIT,
  LEAF_EVAL_EXIT,
  TT_HIT_EXIT,
  TT_CUTOFF_EXIT,
  GAME_OVER_EXIT,
};
constexpr int kNumExitTypes = 5;

// The set of things that can happen when reading from the transposition table.
enum TTReads {
  // The situation is in the TT as an exact evaluation.
  EXACT_READ,
  // The situation is in the TT as a bound and it improves the alpha or beta
  // bound.
  IMPROVEMENT_READ,
  // The situation is in the TT as a bound, but it does not improve the
  // existing bounds.
  USELESS_READ,
  // The situation is not in the TT.
  MISS_READ,
  // The TT is not checked for the situation.
  NO_READ,
};
constexpr int kNumTTReadTypes = 5;

// The set of things that can happen when writing to the transposition table.
enum TTWrites {
  // The situation was in the TT but it is updated with a better value/bound.
  UPDATE_WRITE,
  // The situation was not in the TT and it is added.
  ADD_WRITE,
  // The sitaution was not in the TT and it is added while kicking another
  // situation out.
  REPLACE_WRITE,
  // The situation is not stored in the TT.
  NO_WRITE,
};
constexpr int kNumTTWriteTypes = 4;

struct BenchmarkMetrics {
  long long wall_clock_time_ms = 0;

  // A metric to measure the efficiency of the AI in terms of graph traversals.
  // By graph traversal, we mean an operation that takes linear time on the size
  // of the graph, such as computing the distance between two nodes.
  long long graph_primitives = 0;

  // Keep a counter for each possible exit out of the searsch function.
  // The first dimension is the depth. The second dimension is the type of exit.
  std::array<std::array<long long, kNumExitTypes>, kMaxDepth + 1> num_exits;

  long long ExitsAtDepth(int depth) const {
    long long res = 0;
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type)
      res += num_exits[depth][exit_type];
    return res;
  }

  long long ExitsOfType(int type) const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += num_exits[depth][type];
    return res;
  }

  long long TotalExits() const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth) res += ExitsAtDepth(depth);
    return res;
  }

  // We only need to store these two types of reads. The others can be derived.
  std::array<long long, kMaxDepth + 1> tt_improvement_reads;
  std::array<long long, kMaxDepth + 1> tt_useless_reads;

  long long TTReadsAtDepthOfType(int depth, int read_type) const {
    switch (read_type) {
      case EXACT_READ:
        return num_exits[depth][TT_HIT_EXIT];
      case IMPROVEMENT_READ:
        return tt_improvement_reads[depth];
      case USELESS_READ:
        return tt_useless_reads[depth];
      case MISS_READ:
        return num_exits[depth][REC_EVAL_EXIT] +
               num_exits[depth][TT_CUTOFF_EXIT] - tt_improvement_reads[depth] -
               tt_useless_reads[depth];
      case NO_READ:
        return num_exits[depth][GAME_OVER_EXIT] +
               num_exits[depth][LEAF_EVAL_EXIT];
      default:
        return -1;
    }
  }

  long long TTReadsAtDepth(int depth) const {
    long long res = 0;
    for (int read_type = 0; read_type < kNumTTReadTypes; ++read_type)
      res += TTReadsAtDepthOfType(depth, read_type);
    return res;
  }

  long long TTReadsOfType(int read_type) const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += TTReadsAtDepthOfType(depth, read_type);
    return res;
  }

  long long TotalTTReads() const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += TTReadsAtDepth(depth);
    return res;
  }

  // We only need to store these two types of writes. The others can be derived.
  std::array<long long, kMaxDepth + 1> tt_add_writes;
  std::array<long long, kMaxDepth + 1> tt_replace_writes;

  long long TTWritesAtDepthOfType(int depth, int read_type) const {
    switch (read_type) {
      case UPDATE_WRITE:
        return num_exits[depth][REC_EVAL_EXIT] - tt_add_writes[depth] -
               tt_replace_writes[depth];
      case ADD_WRITE:
        return tt_add_writes[depth];
      case REPLACE_WRITE:
        return tt_replace_writes[depth];
      case NO_WRITE:
        return ExitsAtDepth(depth) - num_exits[depth][REC_EVAL_EXIT];
      default:
        return -1;
    }
  }

  long long TTWritesAtDepth(int depth) const {
    long long res = 0;
    for (int write_type = 0; write_type < kNumTTWriteTypes; ++write_type)
      res += TTWritesAtDepthOfType(depth, write_type);
    return res;
  }

  long long TTWritesOfType(int write_type) const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += TTWritesAtDepthOfType(depth, write_type);
    return res;
  }

  long long TotalTTWrites() const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += TTWritesAtDepth(depth);
    return res;
  }

  // A child is "generated" if it is created and stored in memory. Children that
  // are generated and not visited are called "pruned".
  std::array<long long, kMaxDepth + 1> generated_children;

  long long VisitedChildrenAtDepth(int depth) const {
    if (depth == 0) return 0;
    return ExitsAtDepth(depth - 1);
  }

  long long PrunedChildrenAtDepth(int depth) const {
    return generated_children[depth] - VisitedChildrenAtDepth(depth);
  }

  long long TotalGeneratedChildren() const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += generated_children[depth];
    return res;
  }

  long long TotalVisitedChildren() const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += VisitedChildrenAtDepth(depth);
    return res;
  }

  long long TotalPrunedChildren() const {
    long long res = 0;
    for (int depth = 0; depth <= kMaxDepth; ++depth)
      res += PrunedChildrenAtDepth(depth);
    return res;
  }
};

// Global object updated during the Negamax search using the macros below.
BenchmarkMetrics global_metrics;

#define METRIC_INC(metric)   \
  if (kBenchmark) {          \
    ++global_metrics.metric; \
  }

#define METRIC_ADD(metric, val)   \
  if (kBenchmark) {               \
    global_metrics.metric += val; \
  }

}  // namespace wallwars

#endif  // BENCHMARK_METRICS_H_
