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
  std::cout << "Durations (ms):";
  for (int i = 0; i < kNumTrials; i++) {
    auto start = high_resolution_clock::now();
    Move move = negamaxer.GetMove(sit);
    auto stop = high_resolution_clock::now();
    std::cerr << "Found move: " << move << std::endl;
    milliseconds duration = duration_cast<milliseconds>(stop - start);
    total_ms += duration.count();
    std::cout << " " << duration.count() << std::flush;
  }
  std::cout << std::endl;
  double avg_ms = total_ms / kNumTrials;
  std::cout << "Avg duration (ms): " << avg_ms << std::endl;
  int num_evals = negamaxer.GetNumGameOverEvals() +
                  negamaxer.GetNumDirectEvals() +
                  negamaxer.GetNumRecursiveEvals();
  std::cout << "Num evals: " << num_evals << " ("
            << negamaxer.GetNumGameOverEvals() << " game-over, "
            << negamaxer.GetNumDirectEvals() << " direct, "
            << negamaxer.GetNumRecursiveEvals() << " recursive)" << std::endl;
  std::cout.setf(std::ios::fixed, std::ios::floatfield);
  std::cout << "Evals/s: " << std::setprecision(3) << num_evals / avg_ms
            << std::endl;
}