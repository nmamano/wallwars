#ifndef BENCHMARK_H_
#define BENCHMARK_H_

#include <array>
#include <chrono>
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

long long TotalExitsAtDepth(const BenchmarkMetrics& metrics, int depth) {
  long long res = 0;
  for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
    res += metrics.num_exits[depth][exit_type];
  }
  return res;
}

long long TotalExitsOfType(const BenchmarkMetrics& metrics, int type) {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += metrics.num_exits[depth][type];
  }
  return res;
}

long long TotalExits(const BenchmarkMetrics& metrics) {
  long long res = 0;
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    res += TotalExitsAtDepth(metrics, depth);
  }
  return res;
}

long long TotalTableBoundImprovements(const BenchmarkMetrics& metrics) {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += metrics.table_bound_improvement[depth];
  }
  return res;
}

long long TotalTableUselessHits(const BenchmarkMetrics& metrics) {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += metrics.table_useless_hit[depth];
  }
  return res;
}

long long TableNoChecksAtDepth(const BenchmarkMetrics& metrics, int depth) {
  return metrics.num_exits[depth][GAME_OVER_EXIT] +
         metrics.num_exits[depth][LEAF_EVAL_EXIT];
}

long long TotalTableNoChecks(const BenchmarkMetrics& metrics) {
  return TotalExitsOfType(metrics, GAME_OVER_EXIT) +
         TotalExitsOfType(metrics, LEAF_EVAL_EXIT);
}

long long TableHitsAtDepth(const BenchmarkMetrics& metrics, int depth) {
  return metrics.num_exits[depth][TABLE_HIT_EXIT] +
         metrics.table_bound_improvement[depth] +
         metrics.table_useless_hit[depth];
}

long long TotalTableHits(const BenchmarkMetrics& metrics) {
  return TotalExitsOfType(metrics, TABLE_HIT_EXIT) +
         TotalTableBoundImprovements(metrics) + TotalTableUselessHits(metrics);
}

long long TableMissesAtDepth(const BenchmarkMetrics& metrics, int depth) {
  return TotalExitsAtDepth(metrics, depth) - TableHitsAtDepth(metrics, depth) -
         TableNoChecksAtDepth(metrics, depth);
}

long long TotalTableMisses(const BenchmarkMetrics& metrics) {
  return TotalExits(metrics) - TotalTableHits(metrics) -
         TotalTableNoChecks(metrics);
}

long long TotalTableInsertions(const BenchmarkMetrics& metrics) {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += metrics.transposition_table_insertions[depth];
  }
  return res;
}

long long TotalTableDisplacements(const BenchmarkMetrics& metrics) {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += metrics.transposition_table_displacements[depth];
  }
  return res;
}

long long TableUpdatesByDepth(const BenchmarkMetrics& metrics, int depth) {
  return metrics.num_exits[depth][NORMAL_EXIT] -
         metrics.transposition_table_insertions[depth] -
         metrics.transposition_table_displacements[depth];
}

long long TotalTableUpdates(const BenchmarkMetrics& metrics) {
  return TotalExitsOfType(metrics, NORMAL_EXIT) -
         TotalTableInsertions(metrics) - TotalTableDisplacements(metrics);
}

long long TableNoWritesByDepth(const BenchmarkMetrics& metrics, int depth) {
  return TotalExitsAtDepth(metrics, depth) -
         metrics.transposition_table_insertions[depth] -
         metrics.transposition_table_displacements[depth] -
         TableUpdatesByDepth(metrics, depth);
}

long long TotalTableNoWrites(const BenchmarkMetrics& metrics) {
  return TotalExits(metrics) - TotalTableInsertions(metrics) -
         TotalTableDisplacements(metrics) - TotalTableUpdates(metrics);
}

long long NumChildrenVisitsAsDepth(const BenchmarkMetrics& metrics, int depth) {
  if (depth == 0) return 0;
  return TotalExitsAtDepth(metrics, depth - 1);
}

long long TotalNumChildrenGenerated(const BenchmarkMetrics& metrics) {
  long long res = 0;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    res += metrics.num_generated_children[depth];
  }
  return res;
}

long long PrunedChildrenAtDepth(const BenchmarkMetrics& metrics, int depth) {
  return metrics.num_generated_children[depth] -
         NumChildrenVisitsAsDepth(metrics, depth);
}

long long TotalPrunedChildren(const BenchmarkMetrics& metrics) {
  return TotalNumChildrenGenerated(metrics) - TotalExits(metrics);
}

BenchmarkMetrics AverageMetrics(const std::vector<BenchmarkMetrics>& samples) {
  BenchmarkMetrics avg = {};
  for (const auto& sample : samples) {
    avg.wall_clock_time_ms += sample.wall_clock_time_ms;
    avg.num_graph_primitives += sample.num_graph_primitives;
    for (int depth = 0; depth <= kMaxDepth; ++depth) {
      for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
        avg.num_exits[depth][exit_type] += sample.num_exits[depth][exit_type];
      }
      avg.table_bound_improvement[depth] +=
          sample.table_bound_improvement[depth];
      avg.table_useless_hit[depth] += sample.table_useless_hit[depth];
      avg.transposition_table_insertions[depth] +=
          sample.transposition_table_insertions[depth];
      avg.transposition_table_displacements[depth] +=
          sample.transposition_table_displacements[depth];
      avg.num_generated_children[depth] += sample.num_generated_children[depth];
    }
  }
  int n = samples.size();
  avg.wall_clock_time_ms /= n;
  avg.num_graph_primitives /= n;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      avg.num_exits[depth][exit_type] /= n;
    }
    avg.table_bound_improvement[depth] /= n;
    avg.table_useless_hit[depth] /= n;
    avg.transposition_table_insertions[depth] /= n;
    avg.transposition_table_displacements[depth] /= n;
    avg.num_generated_children[depth] /= n;
  }
  return avg;
}

// Prints relevant settings about the environment (program constants, program
// flags, compiler, OS, hardware, etc.) that provide context about the
// benchmark results.
std::string BenchmarkSettings(std::string description, std::string timestamp) {
  std::ostringstream sout;
  sout << "Description: " << description << "\n"
       << "Time: " << timestamp << "\n\n"
       << "Num benchmark samples: " << kNumBenchmarkSamples << "\n"
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

/* We are interested in both the break down by depth and by "exit type". Exit
 * type refers on how we exit the search function when we visit a node. */
std::string ExitTypeTable(const BenchmarkMetrics& metrics) {
  std::vector<std::string> kExitTypes{"normal", "leaf-eval", "table-hit",
                                      "table-cutoff", "game-over"};
  StrTable table;
  table.AddToNewRow(std::vector<std::string>{"Depth", "Total", "%", "|"});
  for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
    table.AddToLastRow(std::vector<std::string>{kExitTypes[exit_type], "%"});
  }
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    table.AddToNewRow(depth);
    long long total_row = TotalExitsAtDepth(metrics, depth);
    table.AddToLastRow(total_row);
    table.AddToLastRow((100.0 * total_row) / TotalExits(metrics), 1);
    table.AddToLastRow("|");
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      table.AddToLastRow(metrics.num_exits[depth][exit_type]);
      table.AddToLastRow(
          (100.0 * metrics.num_exits[depth][exit_type]) / total_row, 1);
    }
  }
  {
    table.AddToNewRow("Sum");
    long long total = TotalExits(metrics);
    table.AddToLastRow(total);
    table.AddToLastRow(100.0, 1);
    table.AddToLastRow("|");
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      table.AddToLastRow(TotalExitsOfType(metrics, exit_type));
      table.AddToLastRow(
          (100.0 * TotalExitsOfType(metrics, exit_type)) / TotalExits(metrics),
          1);
    }
  }
  std::ostringstream sout;
  sout << "Visit distribution by depth:\n";
  table.Print(sout);
  return sout.str();
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
std::string TranspositionTableTable(const BenchmarkMetrics& metrics) {
  StrTable table1, table2;
  std::vector<std::string> header_row = {
      "Depth",    "Visits", "|",      "Exact", "Improv",  "Useless", "Miss",
      "No-check", "|",      "Update", "Add",   "Replace", "No-write"};
  table1.AddToNewRow(header_row);
  table2.AddToNewRow(header_row);
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    table1.AddToNewRow(depth);
    table2.AddToNewRow(depth);
    long long total_visits = TotalExitsAtDepth(metrics, depth);
    table1.AddToLastRow(total_visits);
    table2.AddToLastRow(100.0, 1);
    table1.AddToLastRow("|");
    table2.AddToLastRow("|");
    {
      long long exact_hits = metrics.num_exits[depth][TABLE_HIT_EXIT];
      long long bound_improvement_hits = metrics.table_bound_improvement[depth];
      long long useless_hits = metrics.table_useless_hit[depth];
      long long misses = TableMissesAtDepth(metrics, depth);
      long long no_checks = TableNoChecksAtDepth(metrics, depth);
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
      long long updates = TableUpdatesByDepth(metrics, depth);
      long long insertions = metrics.transposition_table_insertions[depth];
      long long displacements =
          metrics.transposition_table_displacements[depth];
      long long no_writes = TableNoWritesByDepth(metrics, depth);
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
    long long total_visits = TotalExits(metrics);
    table1.AddToLastRow(total_visits);
    table2.AddToLastRow(100.0, 1);
    table1.AddToLastRow("|");
    table2.AddToLastRow("|");
    {
      long long exact_hits = TotalExitsOfType(metrics, TABLE_HIT_EXIT);
      long long bound_improvement_hits = TotalTableBoundImprovements(metrics);
      long long useless_hits = TotalTableUselessHits(metrics);
      long long misses = TotalTableMisses(metrics);
      long long no_checks = TotalTableNoChecks(metrics);
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
      long long updates = TotalTableUpdates(metrics);
      long long insertions = TotalTableInsertions(metrics);
      long long displacements = TotalTableDisplacements(metrics);
      long long no_writes = TotalTableNoWrites(metrics);
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

std::string ChildGenerationTable(const BenchmarkMetrics& metrics) {
  StrTable table;
  table.AddToNewRow({"Depth", "Generated", "Visited", "%", "Pruned", "%"});
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    long long generated = metrics.num_generated_children[depth];
    long long visited = NumChildrenVisitsAsDepth(metrics, depth);
    long long pruned = PrunedChildrenAtDepth(metrics, depth);
    table.AddToNewRow(depth);
    table.AddToLastRow(generated);
    table.AddToLastRow(visited);
    table.AddToLastRow((100.0 * visited) / generated, 1);
    table.AddToLastRow(pruned);
    table.AddToLastRow((100.0 * pruned) / generated, 1);
  }
  {
    table.AddToNewRow("Sum");
    long long generated = TotalNumChildrenGenerated(metrics);
    long long visited = TotalExits(metrics);
    long long pruned = TotalPrunedChildren(metrics);
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
std::string BenchmarkMetricsReport(const BenchmarkMetrics& metrics) {
  std::ostringstream sout;
  long long ms = metrics.wall_clock_time_ms;
  long long gp = metrics.num_graph_primitives;
  sout << "Duration (ms): " << ms << '\n' << "Graph primitives: " << gp;
  if (ms > 0) sout << " (" << gp / ms << "/ms)";
  sout << "\n\n"
       << ExitTypeTable(metrics) << '\n'
       << TranspositionTableTable(metrics) << '\n'
       << ChildGenerationTable(metrics);
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

void StreamAndStdOut(std::ostream& out, std::string s) {
  std::cout << s << std::endl;
  out << s << std::endl;
}

void StreamAndStdOutEmptyLine(std::ostream& out) {
  std::cout << std::endl;
  out << std::endl;
}

void AddCsvHeaderRow(std::ostream& out) {
  std::vector<std::string> csv_columns{
      "situation",           "runtime-ms",       "graph-primitives",
      "normal-visits",       "leaf-eval-visits", "table-hit-visits",
      "table-cutoff-visits", "game-over-visits", "tt-exact",
      "tt-improv",           "tt-useless",       "tt-miss",
      "tt-no-check",         "tt-update",        "tt-add",
      "tt-replace",          "tt-no-write",      "visited-children",
      "generated-children"};
  for (size_t i = 0; i < csv_columns.size(); ++i) {
    if (i > 0) out << ",";
    out << csv_columns[i];
  }
  out << std::endl;
}

void AddCsvRow(std::ostream& out, std::string sit_name,
               const BenchmarkMetrics& metrics) {
  out << sit_name << "," << metrics.wall_clock_time_ms << ","
      << metrics.num_graph_primitives;
  for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
    out << "," << TotalExitsOfType(metrics, exit_type);
  }
  out << "," << TotalExitsOfType(metrics, TABLE_HIT_EXIT) << ","
      << TotalTableBoundImprovements(metrics) << ","
      << TotalTableUselessHits(metrics) << "," << TotalTableMisses(metrics)
      << "," << TotalTableNoChecks(metrics) << "," << TotalTableUpdates(metrics)
      << "," << TotalTableInsertions(metrics) << ","
      << TotalTableDisplacements(metrics) << "," << TotalTableNoWrites(metrics)
      << "," << TotalExits(metrics) << "," << TotalPrunedChildren(metrics)
      << std::endl;
}

// Runs the AI to find a move in an RxC board after playing some moves
// specified in standard notation, setting `benchmark_metrics` in the process.
// Then, uses `benchmark_metrics` to generate benchmarking reports.
template <int R, int C>
void BenchmarkSituation(std::ostream& report_out, std::ostream& csv_out,
                        std::string sit_name, std::string standard_notation) {
  Situation<R, C> sit = ParseSituationOrCrash<R, C>(standard_notation);
  std::vector<BenchmarkMetrics> samples;
  StreamAndStdOut(report_out, "Situation: " + sit_name);
  for (int i = 0; i < kNumBenchmarkSamples; ++i) {
    Negamax<R, C> negamaxer;
    auto move_metrics = negamaxer.GetMoveWithMetrics(sit);
    StreamAndStdOut(report_out, "Chosen move " + std::to_string(i + 1) + ": " +
                                    sit.MoveToString(move_metrics.first));
    samples.push_back(move_metrics.second);
  }
  BenchmarkMetrics avg_metrics = AverageMetrics(samples);
  StreamAndStdOut(report_out, BenchmarkMetricsReport(avg_metrics));
  AddCsvRow(csv_out, sit_name, avg_metrics);
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
  using namespace benchmark_internal;

  if (!wallwars::Tests::RunTests()) {
    std::cout << "Benchmark did not start due to failing tests." << std::endl;
  }

  std::ostringstream report_out;
  std::ostringstream csv_out;
  AddCsvHeaderRow(csv_out);

  std::string timestamp = CurrentTimestamp();
  StreamAndStdOut(report_out, BenchmarkSettings(description, timestamp));

  StreamAndStdOutEmptyLine(report_out);
  StreamAndStdOut(report_out, DimensionsSettings<10, 12>());
  BenchmarkSituation<10, 12>(report_out, csv_out, "Start-position", "");
  BenchmarkSituation<10, 12>(report_out, csv_out, "Trident-opening",
                             "1. b2 2. b3v c2>");

  StreamAndStdOutEmptyLine(report_out);
  StreamAndStdOut(report_out, DimensionsSettings<4, 4>());
  BenchmarkSituation<4, 4>(report_out, csv_out, "Empty-4x4", "");

  StreamAndStdOutEmptyLine(report_out);
  StreamAndStdOut(report_out, DimensionsSettings<6, 9>());
  BenchmarkSituation<6, 9>(
      report_out, csv_out, "Tim-puzzle",
      "1. g3v h3v 2. b3v c3v 3. e3v f3v 4. c4> d3v 5. f4> f5> 6. c5> c6> 7. "
      "f1> f6> 8. c1> c2> 9. a2 f2> 10. h2> h3>");

  // Put the benchmark results in `benchmark_dir`.
  std::string benchmark_dir = "../benchmark_out/";
  std::string report_file_name = benchmark_dir + timestamp + ".txt";
  std::string csv_file_name = benchmark_dir + timestamp + ".csv";
  std::ofstream report_fout(report_file_name);
  std::ofstream csv_fout(csv_file_name);
  report_fout << report_out.str();
  csv_fout << csv_out.str();
  report_fout.close();
  csv_fout.close();
}

}  // namespace wallwars

#endif  // BENCHMARK_H_