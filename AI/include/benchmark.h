#ifndef BENCHMARK_H_
#define BENCHMARK_H_

#include <array>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

#include "assert.h"
#include "benchmark_metrics.h"
#include "graph.h"
#include "macro_utils.h"
#include "negamax.h"
#include "situation.h"
#include "utils.h"

namespace wallwars {

namespace benchmark_internal {

void PrintSettings() {
  using namespace std::chrono;
  auto cur_time = system_clock::to_time_t(system_clock::now());
  std::cout << "Date: " << std::ctime(&cur_time);
  std::cout << "Notes: {describe tested algorithm here}" << std::endl;
  std::cout << "Negamax depth: " << kMaxDepth << std::endl;
  std::cout << "Sizes (bytes): int: " << sizeof(int)
            << " Move: " << sizeof(Move) << std::endl;
}

long long TotalExitsAtDepth(int depth) {
  long long res = 0;
  for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
    res += benchmark_metrics.num_exits[depth][exit_type];
  }
  return res;
}

long long TotalExitsOfType(int type) {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += benchmark_metrics.num_exits[depth][type];
  }
  return res;
}

long long TotalExits() {
  long long res = 0;
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    res += TotalExitsAtDepth(depth);
  }
  return res;
}

/* We are interested in both the break down by depth and by "exit type". Exit
 * type refers on how we exit the search function when we visit a node. */
void PrintExitSummary() {
  std::vector<std::string> kExitTypes{"normal", "leaf-eval", "table-hit",
                                      "table-cutoff", "game-over"};

  std::cout << "Visit distribution by depth:" << std::endl;
  StrTable table;
  table.AddToNewRow(std::vector<std::string>{"Depth", "Total", "%", "|"});
  for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
    table.AddToLastRow(std::vector<std::string>{kExitTypes[exit_type], "%"});
  }
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    table.AddToNewRow(depth);
    long long total_row = TotalExitsAtDepth(depth);
    table.AddToLastRow(total_row);
    table.AddToLastRow((100.0 * total_row) / TotalExits(), 1);
    table.AddToLastRow("|");
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      table.AddToLastRow(benchmark_metrics.num_exits[depth][exit_type]);
      table.AddToLastRow(
          (100.0 * benchmark_metrics.num_exits[depth][exit_type]) / total_row,
          1);
    }
  }
  {
    table.AddToNewRow("Sum");
    long long total = TotalExits();
    table.AddToLastRow(total);
    table.AddToLastRow(100.0, 1);
    table.AddToLastRow("|");
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      table.AddToLastRow(TotalExitsOfType(exit_type));
      table.AddToLastRow((100.0 * TotalExitsOfType(exit_type)) / TotalExits(),
                         1);
    }
  }
  table.Print(std::cout);
}

long long TotalTableBoundImprovements() {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += benchmark_metrics.table_bound_improvement[depth];
  }
  return res;
}

long long TotalTableUselessHits() {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += benchmark_metrics.table_useless_hit[depth];
  }
  return res;
}

long long TotalTableInsertions() {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += benchmark_metrics.transposition_table_insertions[depth];
  }
  return res;
}

long long TotalTableDisplacements() {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += benchmark_metrics.transposition_table_displacements[depth];
  }
  return res;
}

/* The transposition table is read at the beginning of a visit and written at
 * the end. When reading, 4 things can happen: 1. we find that situation with
 * exact evaluation. 2. we find either an upper bound or a lower bound for the
 * evaluation. There are 3 subcases: 2.a. the bound allows an immediate
 * alpha-beta cutoff. 2.b. the bound improves the alpha-beta window (it is
 * inside the starting window). 2.c. the bound is useless (it is outside of
 * the starting window). 3. we do not find the situation in the table. 4. we
 * do not even check the table. When writing, 2 things can happen: if the
 * situation was already in the table, we overwrite it with the new
 * evaluation. This can be an exact evaluation, an upper bound, or a lower
 * bound. If the situation was not in the table, we add it. The two subcases
 * are whether we kick out a pre-existing entry or not.  */
void PrintTranspositionTableSummary() {
  StrTable table1, table2;
  std::vector<std::string> header_row = {
      "Depth",    "Visits", "|",      "Exact", "Improv",  "Useless", "Miss",
      "No-check", "|",      "Update", "Add",   "Replace", "No-write"};
  table1.AddToNewRow(header_row);
  table2.AddToNewRow(header_row);
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    table1.AddToNewRow(depth);
    table2.AddToNewRow(depth);
    long long total_visits = TotalExitsAtDepth(depth);
    table1.AddToLastRow(total_visits);
    table2.AddToLastRow(100.0, 1);
    table1.AddToLastRow("|");
    table2.AddToLastRow("|");
    {
      long long exact_hits = benchmark_metrics.num_exits[depth][TABLE_HIT_EXIT];
      long long bound_improvement_hits =
          benchmark_metrics.table_bound_improvement[depth];
      long long useless_hits = benchmark_metrics.table_useless_hit[depth];
      long long total_hits = exact_hits + bound_improvement_hits + useless_hits;
      long long no_checks = benchmark_metrics.num_exits[depth][GAME_OVER_EXIT] +
                            benchmark_metrics.num_exits[depth][LEAF_EVAL_EXIT];
      long long misses = total_visits - total_hits - no_checks;
      table1.AddToLastRow(exact_hits);
      table2.AddToLastRow((100.0 * exact_hits) / total_visits, 2);
      table1.AddToLastRow(bound_improvement_hits);
      table2.AddToLastRow((100.0 * bound_improvement_hits) / total_visits, 2);
      table1.AddToLastRow(useless_hits);
      table2.AddToLastRow((100.0 * useless_hits) / total_visits, 2);
      table1.AddToLastRow(misses);
      table2.AddToLastRow((100.0 * misses) / total_visits, 2);
      table1.AddToLastRow(no_checks);
      table2.AddToLastRow((100.0 * no_checks) / total_visits, 2);
      table1.AddToLastRow("|");
      table2.AddToLastRow("|");
    }
    {
      long long insertions =
          benchmark_metrics.transposition_table_insertions[depth];
      long long displacements =
          benchmark_metrics.transposition_table_displacements[depth];
      long long updates = benchmark_metrics.num_exits[depth][NORMAL_EXIT] -
                          insertions - displacements;
      long long no_writes = total_visits - insertions - displacements - updates;
      table1.AddToLastRow(updates);
      table2.AddToLastRow((100.0 * updates) / total_visits, 2);
      table1.AddToLastRow(insertions);
      table2.AddToLastRow((100.0 * insertions) / total_visits, 2);
      table1.AddToLastRow(displacements);
      table2.AddToLastRow((100.0 * displacements) / total_visits, 2);
      table1.AddToLastRow(no_writes);
      table2.AddToLastRow((100.0 * no_writes) / total_visits, 2);
    }
  }
  {
    table1.AddToNewRow("Sum");
    table2.AddToNewRow("Sum");
    long long total_visits = TotalExits();
    table1.AddToLastRow(total_visits);
    table2.AddToLastRow(100.0, 1);
    table1.AddToLastRow("|");
    table2.AddToLastRow("|");
    {
      long long exact_hits = TotalExitsOfType(TABLE_HIT_EXIT);
      long long bound_improvement_hits = TotalTableBoundImprovements();
      long long useless_hits = TotalTableUselessHits();
      long long total_hits = exact_hits + bound_improvement_hits + useless_hits;
      long long no_checks =
          TotalExitsOfType(GAME_OVER_EXIT) + TotalExitsOfType(LEAF_EVAL_EXIT);
      long long misses = total_visits - total_hits - no_checks;
      table1.AddToLastRow(exact_hits);
      table2.AddToLastRow((100.0 * exact_hits) / total_visits, 2);
      table1.AddToLastRow(bound_improvement_hits);
      table2.AddToLastRow((100.0 * bound_improvement_hits) / total_visits, 2);
      table1.AddToLastRow(useless_hits);
      table2.AddToLastRow((100.0 * useless_hits) / total_visits, 2);
      table1.AddToLastRow(misses);
      table2.AddToLastRow((100.0 * misses) / total_visits, 2);
      table1.AddToLastRow(no_checks);
      table2.AddToLastRow((100.0 * no_checks) / total_visits, 2);
      table1.AddToLastRow("|");
      table2.AddToLastRow("|");
    }
    {
      long long insertions = TotalTableInsertions();
      long long displacements = TotalTableDisplacements();
      long long updates =
          TotalExitsOfType(NORMAL_EXIT) - insertions - displacements;
      long long no_writes = total_visits - insertions - displacements - updates;
      table1.AddToLastRow(updates);
      table2.AddToLastRow((100.0 * updates) / total_visits, 2);
      table1.AddToLastRow(insertions);
      table2.AddToLastRow((100.0 * insertions) / total_visits, 2);
      table1.AddToLastRow(displacements);
      table2.AddToLastRow((100.0 * displacements) / total_visits, 2);
      table1.AddToLastRow(no_writes);
      table2.AddToLastRow((100.0 * no_writes) / total_visits, 2);
    }
  }
  std::cout << "Transposition table statistics: Depth | Reads | Writes"
            << std::endl;
  table1.Print(std::cout, 2);
  std::cout << std::endl
            << "Transposition table statistics (%): Depth | Reads | Writes"
            << std::endl;
  table2.Print(std::cout, 2);
}

long long NumChildrenVisitsAsDepth(int depth) {
  if (depth == 0) return 0;
  return TotalExitsAtDepth(depth - 1);
}

long long TotalNumChildrenGenerated() {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += benchmark_metrics.num_generated_children[depth];
  }
  return res;
}

void PrintChildGenerationSummary() {
  std::cout << "Child generation statistics by depth:" << std::endl;
  StrTable table;
  table.AddToNewRow({"Depth", "Generated", "Visited", "%", "Pruned", "%"});
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    long long generated = benchmark_metrics.num_generated_children[depth];
    long long visited = NumChildrenVisitsAsDepth(depth);
    long long pruned = generated - visited;
    table.AddToNewRow(depth);
    table.AddToLastRow(generated);
    table.AddToLastRow(visited);
    table.AddToLastRow((100.0 * visited) / generated, 1);
    table.AddToLastRow(pruned);
    table.AddToLastRow((100.0 * pruned) / generated, 1);
  }
  {
    table.AddToNewRow("Sum");
    long long generated = TotalNumChildrenGenerated();
    long long visited = TotalExits();
    long long pruned = generated - visited;
    table.AddToLastRow(generated);
    table.AddToLastRow(visited);
    table.AddToLastRow((100.0 * visited) / generated, 1);
    table.AddToLastRow(pruned);
    table.AddToLastRow((100.0 * pruned) / generated, 1);
  }
  table.Print(std::cout, 2);
}

// benchmark_metrics is a global variable. This function assumes that it has
// been set as a result of the AI finding a move in a situation.
void ProcessBenchmarkMetrics() {
  std::cout << std::endl
            << "Duration (ms): " << benchmark_metrics.wall_clock_time_ms
            << std::endl
            << "Graph primitives: " << benchmark_metrics.num_graph_primitives
            << " ("
            << benchmark_metrics.num_graph_primitives /
                   benchmark_metrics.wall_clock_time_ms
            << "/ms)" << std::endl
            << std::endl;
  PrintExitSummary();
  std::cout << std::endl;
  PrintTranspositionTableSummary();
  std::cout << std::endl;
  PrintChildGenerationSummary();
}

template <int R, int C>
class BenchmarkDimensions {
 public:
  // Runs the AI to find a move in an RxC board after playing some moves
  // specified in standard notation, setting `benchmark_metrics` in the process.
  // Then, uses `benchmark_metrics` to generate benchmarking reports.
  void Run(std::string sit_name, std::string standard_notation) {
    Situation<R, C> sit = ParseSituationOrCrash(standard_notation);
    std::cout << std::endl << "Situation " << sit_name << std::endl;
    {
      using namespace std::chrono;
      Negamax<R, C> negamaxer;
      auto start = high_resolution_clock::now();
      Move move = negamaxer.GetMove(sit);
      auto stop = high_resolution_clock::now();
      benchmark_metrics.wall_clock_time_ms =
          duration_cast<milliseconds>(stop - start).count();
      std::cerr << "Found move: " << sit.MoveToString(move) << std::endl;
    }
    ProcessBenchmarkMetrics();
  }

  void PrintBoardSettings() {
    std::cout << "Board dimensions: " << R << " x " << C << std::endl
              << "Branching factor: " << MaxNumLegalMoves(R, C) << std::endl
              << "Sizes (bytes): Graph: " << sizeof(Graph<R, C>)
              << " Situation: " << sizeof(Situation<R, C>) << std::endl;
  }

 private:
  Situation<R, C> ParseSituationOrCrash(std::string standard_notation) {
    Situation<R, C> sit;
    if (!sit.BuildFromStandardNotationMoves(standard_notation)) {
      std::exit(EXIT_FAILURE);
    }
    return sit;
  }
};

}  // namespace benchmark_internal

void RunBenchmark() {
  using namespace benchmark_internal;
  PrintSettings();

  BenchmarkDimensions<10, 12> benchmark_10_12;
  benchmark_10_12.PrintBoardSettings();
  benchmark_10_12.Run("Start-position", "");
  benchmark_10_12.Run("Trident-opening", "1. b2 2. b3v c2>");

  BenchmarkDimensions<4, 4> benchmark_4_4;
  benchmark_4_4.PrintBoardSettings();
  benchmark_4_4.Run("Empty-4x4", "");
}

}  // namespace wallwars

#endif  // BENCHMARK_H_