#include "benchmark.h"

#include <array>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

#include "assert.h"
#include "graph.h"
#include "human.h"
#include "io.h"
#include "mover.h"
#include "negamaxer.h"
#include "situation.h"
#include "walker.h"

constexpr int kNumTrials = 5;

void RunBenchmark() {
  using namespace std::chrono;
  auto cur_time = system_clock::to_time_t(system_clock::now());
  std::cout << "Date: " << std::ctime(&cur_time);
  std::cout << "Notes: {describe tested algorithm here}" << std::endl;
  std::cout << "Board dimensions: " << kNumRows << " x " << kNumCols
            << std::endl;
  std::cout << "Negamax depth: " << kMaxDepth << std::endl;
  std::cout << "Branching factor: " << kMaxNumLegalMoves << std::endl;
  std::cout << "Sizes (bytes): int: " << sizeof(int)
            << " Graph: " << sizeof(Graph)
            << " Situation: " << sizeof(Situation) << " Move: " << sizeof(Move)
            << std::endl;
  Situation sit;
  Negamaxer negamaxer;
  long long total_ms = 0;
  long long total_game_over_evals = 0;
  long long total_memoized_evals = 0;
  long long total_direct_evals = 0;
  long long total_recursive_evals = 0;
  long long total_memoized_situations = 0;
  std::cout << "Durations (ms):";
  for (int i = 0; i < kNumTrials; i++) {
    auto start = high_resolution_clock::now();
    Move move = negamaxer.GetMove(sit);
    auto stop = high_resolution_clock::now();
    milliseconds duration = duration_cast<milliseconds>(stop - start);
    std::cout << " " << duration.count() << std::flush;
    std::cerr << "Found move: " << move << std::endl;

    // Track metrics.
    total_ms += duration.count();
    total_game_over_evals += negamaxer.GetNumGameOverEvals();
    total_memoized_evals += negamaxer.GetNumMemoizedEvals();
    total_direct_evals += negamaxer.GetNumDirectEvals();
    total_recursive_evals += negamaxer.GetNumRecursiveEvals();
    total_memoized_situations += negamaxer.GetNumMemoizedSituations();
  }
  std::cout << std::endl;

  long long total_evals = total_game_over_evals + total_memoized_evals +
                          total_direct_evals + total_recursive_evals;
  std::cout << "Avg duration (ms): " << total_ms / kNumTrials << std::endl;
  std::cout << "Avg evals: " << total_evals / kNumTrials
            << " (game-over: " << total_game_over_evals / kNumTrials
            << " memoized: " << total_memoized_evals / kNumTrials
            << " direct: " << total_direct_evals / kNumTrials
            << " recursive: " << total_recursive_evals / kNumTrials << ")"
            << std::endl;
  std::cout << "Avg memoized situations: "
            << total_memoized_situations / kNumTrials << std::endl;
  std::cout << "Evals/s: " << 1000 * total_evals / total_ms << std::endl;
}