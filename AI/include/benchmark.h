#ifndef BENCHMARK_H_
#define BENCHMARK_H_

#include <array>
#include <fstream>
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
#include "tests.h"
#include "utils.h"

namespace wallwars {

namespace benchmark_internal {

// Prints relevant settings about the environment (program constants, program
// flags, compiler, OS, hardware, etc.) that provide context about the
// benchmark results.
std::string BenchmarkSettings(std::string description, std::string timestamp) {
  std::ostringstream sout;
  sout << "Description: " << description << "\n"
       << "Time: " << timestamp << "\n\n"
       << "Negamax depth: " << kMaxDepth << '\n'
       << "Sizes (bytes): int: " << sizeof(int) << " Move: " << sizeof(Move)
       << '\n';
  return sout.str();
}

// Prints settings about the environment that change based on the dimensions (R
// and C).
template <int R, int C>
std::string DimensionsSettings() {
  std::ostringstream sout;
  sout << "Board dimensions: " << R << " x " << C << '\n'
       << "Branching factor: " << MaxNumLegalMoves(R, C) << '\n'
       << "Sizes (bytes): Graph: " << sizeof(Graph<R, C>)
       << " Situation: " << sizeof(Situation<R, C>) << '\n';
  return sout.str();
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
std::string ExitTypeTable() {
  std::vector<std::string> kExitTypes{"normal", "leaf-eval", "table-hit",
                                      "table-cutoff", "game-over"};
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
  std::ostringstream sout;
  sout << "Visit distribution by depth:\n";
  table.Print(sout);
  return sout.str();
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
std::string TranspositionTableTable() {
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
  std::ostringstream sout;
  sout << "Transposition table statistics: Depth | Reads | Writes\n";
  table1.Print(sout, 2);
  sout << "\nTransposition table statistics (%): Depth | Reads | Writes\n";
  table2.Print(sout, 2);
  return sout.str();
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

std::string ChildGenerationTable() {
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
  std::ostringstream sout;
  sout << "Child generation statistics by depth:\n";
  table.Print(sout, 2);
  return sout.str();
}

// `benchmark_metrics` is a global variable. This function assumes that it has
// been set as a result of the AI finding a move in a situation.
std::string BenchmarkMetricsReport() {
  std::ostringstream sout;
  long long ms = benchmark_metrics.wall_clock_time_ms;
  long long gp = benchmark_metrics.num_graph_primitives;
  sout << "Duration (ms): " << ms << '\n' << "Graph primitives: " << gp;
  if (ms > 0) sout << " (" << gp / ms << "/ms)";
  sout << "\n\n"
       << ExitTypeTable() << '\n'
       << TranspositionTableTable() << '\n'
       << ChildGenerationTable();
  return sout.str();
}

template <int R, int C>
Situation<R, C> ParseSituationOrCrash(std::string standard_notation) {
  Situation<R, C> sit;
  if (!sit.BuildFromStandardNotationMoves(standard_notation)) {
    std::cerr << "Failed to parse standard notation" << std::endl;
    std::exit(EXIT_FAILURE);
  }
  return sit;
}

void FileAndStdOut(std::ofstream& fout, std::string s) {
  std::cout << s;
  fout << s;
}

void FileAndStdOutLine(std::ofstream& fout, std::string s) {
  std::cout << s << std::endl;
  fout << s << std::endl;
}

void FileAndStdOutEmptyLine(std::ofstream& fout) {
  std::cout << std::endl;
  fout << std::endl;
}

// Runs the AI to find a move in an RxC board after playing some moves
// specified in standard notation, setting `benchmark_metrics` in the process.
// Then, uses `benchmark_metrics` to generate benchmarking reports.
template <int R, int C>
void BenchmarkSituation(std::ofstream& fout, std::string sit_name,
                        std::string standard_notation) {
  using namespace std::chrono;
  Situation<R, C> sit = ParseSituationOrCrash<R, C>(standard_notation);
  Negamax<R, C> negamaxer;
  auto start = high_resolution_clock::now();
  Move move = negamaxer.GetMove(sit);
  auto stop = high_resolution_clock::now();
  benchmark_metrics.wall_clock_time_ms =
      duration_cast<milliseconds>(stop - start).count();
  FileAndStdOutLine(fout, "Situation: " + sit_name);
  FileAndStdOutLine(fout, "Chosen move: " + sit.MoveToString(move));
  FileAndStdOut(fout, BenchmarkMetricsReport());
}

}  // namespace benchmark_internal

// Creates two files: 1. ../benchmark_out/{timestamp}.txt: a human-readable
// report with metadata and vertically aligned text tables. This report is also
// printed to standard output. 2. ../benchmark_out/{timestamp}.csv: the raw data
// in csv format, for easy computer parsing. The csv has one row per benchmark
// situation and one column per metric.
// `description` is a short string describing what is being benchmarked (e.g.,
// the name of a newly implemented optimization). It is included in the
// human-readable report.
void RunBenchmark(const std::string& description) {
  if (!wallwars::Tests::RunTests()) {
    std::cout << "Benchmark did not start due to failing tests." << std::endl;
  }

  // Put the benchmark results are outside the BUILD directory
  std::string benchmark_dir = "../benchmark_out/";
  std::string timestamp = CurrentTimestamp();
  std::string report_file_name = benchmark_dir + timestamp + ".txt";
  std::string csv_file_name = benchmark_dir + timestamp + ".csv";
  std::ofstream fout(report_file_name);

  using namespace benchmark_internal;
  FileAndStdOutLine(fout, BenchmarkSettings(description, timestamp));
  FileAndStdOutEmptyLine(fout);

  FileAndStdOutLine(fout, DimensionsSettings<10, 12>());
  BenchmarkSituation<10, 12>(fout, "Start-position", "");
  FileAndStdOutEmptyLine(fout);
  BenchmarkSituation<10, 12>(fout, "Trident-opening", "1. b2 2. b3v c2>");
  FileAndStdOutEmptyLine(fout);
  FileAndStdOutEmptyLine(fout);

  FileAndStdOutLine(fout, DimensionsSettings<4, 4>());
  BenchmarkSituation<4, 4>(fout, "Empty-4x4", "");
  FileAndStdOutEmptyLine(fout);
  FileAndStdOutEmptyLine(fout);

  FileAndStdOutLine(fout, DimensionsSettings<6, 9>());
  BenchmarkSituation<6, 9>(
      fout, "Tim-puzzle",
      "1. g3v h3v 2. b3v c3v 3. e3v f3v 4. c4> d3v 5. f4> f5> 6. c5> c6> 7. "
      "f1> f6> 8. c1> c2> 9. a2 f2> 10. h2> h3>");

  fout.close();
}

}  // namespace wallwars

#endif  // BENCHMARK_H_