#ifndef BENCHMARK_H_
#define BENCHMARK_H_

#include <algorithm>
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

BenchmarkMetrics AverageMetrics(const std::vector<BenchmarkMetrics>& samples) {
  BenchmarkMetrics avg = {};
  for (const auto& sample : samples) {
    avg.wall_clock_time_ms += sample.wall_clock_time_ms;
    avg.graph_primitives += sample.graph_primitives;
    for (int depth = 0; depth <= kMaxDepth; ++depth) {
      for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
        avg.num_exits[depth][exit_type] += sample.num_exits[depth][exit_type];
      }
      avg.tt_improvement_reads[depth] += sample.tt_improvement_reads[depth];
      avg.tt_useless_reads[depth] += sample.tt_useless_reads[depth];
      avg.tt_add_writes[depth] += sample.tt_add_writes[depth];
      avg.tt_replace_writes[depth] += sample.tt_replace_writes[depth];
      avg.generated_children[depth] += sample.generated_children[depth];
    }
    for (int i = 0; i < MaxNumLegalMoves(10, 12); ++i) {
      avg.cutoff_distr[i] += sample.cutoff_distr[i];
    }
  }
  int n = samples.size();
  avg.wall_clock_time_ms /= n;
  avg.graph_primitives /= n;
  for (int depth = 0; depth <= kMaxDepth; ++depth) {
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      avg.num_exits[depth][exit_type] /= n;
    }
    avg.tt_improvement_reads[depth] /= n;
    avg.tt_useless_reads[depth] /= n;
    avg.tt_add_writes[depth] /= n;
    avg.tt_replace_writes[depth] /= n;
    avg.generated_children[depth] /= n;
  }
  for (int i = 0; i < MaxNumLegalMoves(10, 12); ++i) {
    avg.cutoff_distr[i] /= n;
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

const std::vector<std::string> kCsvColumns = {"situation",
                                              "move",
                                              "runtime_ms",
                                              "graph_primitives",
                                              "rec_eval_exits",
                                              "leaf_eval_exits",
                                              "tt_hit_exits",
                                              "tt_cutoff_exits",
                                              "game_over_exits",
                                              "tt_exact_reads",
                                              "tt_improvement_reads",
                                              "tt_useless_reads",
                                              "tt_miss_reads",
                                              "tt_no_reads",
                                              "tt_update_writes",
                                              "tt_add_writes",
                                              "tt_replace_writes",
                                              "tt_no_writes",
                                              "generated_children",
                                              "visited_children",
                                              "pruned_children"};

std::string CsvHeaderRow() {
  std::ostringstream sout;
  for (size_t i = 0; i < kCsvColumns.size(); ++i) {
    if (i > 0) sout << ",";
    sout << kCsvColumns[i];
  }
  sout << std::endl;
  return sout.str();
}

std::string CsvRow(const std::string& sit_name, const std::string& move,
                   const BenchmarkMetrics& m) {
  std::ostringstream sout;
  sout << sit_name << "," << move << "," << m.wall_clock_time_ms << ","
       << m.graph_primitives;
  for (int i = 0; i < kNumExitTypes; ++i) sout << "," << m.ExitsOfType(i);
  for (int i = 0; i < kNumTTReadTypes; ++i) sout << "," << m.TTReadsOfType(i);
  for (int i = 0; i < kNumTTWriteTypes; ++i) sout << "," << m.TTWritesOfType(i);
  sout << "," << m.TotalGeneratedChildren() << "," << m.TotalVisitedChildren()
       << "," << m.TotalPrunedChildren() << std::endl;
  return sout.str();
}

double Percentage(double x, double total) { return 100.0 * x / total; }

// One column per exit type and one row per depth, with 2 special rows at the
// end: one with the sum across depths, and one with the sums from
// `prev_csv`, if provided.
std::string ExitTypeTable(std::map<std::string, std::string> prev_csv,
                          const BenchmarkMetrics& m) {
  StrTable table;
  table.AddToNewRow({"Depth", "Total", "%", "|", "rec_eval", "%", "leaf_eval",
                     "%", "tt_hit", "%", "tt_cutoff", "%", "game_over", "%"});
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    table.AddToNewRow(depth);
    long long total_row = m.ExitsAtDepth(depth);
    table.AddToLastRow(total_row);
    table.AddToLastRow(Percentage(total_row, m.TotalExits()), 1);
    table.AddToLastRow("|");
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      table.AddToLastRow(m.num_exits[depth][exit_type]);
      table.AddToLastRow(Percentage(m.num_exits[depth][exit_type], total_row),
                         1);
    }
  }
  table.AddHorizontalLineRow();
  {
    table.AddToNewRow("Sum");
    long long total = m.TotalExits();
    table.AddToLastRow(total);
    table.AddToLastRow("100");
    table.AddToLastRow("|");
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      table.AddToLastRow(m.ExitsOfType(exit_type));
      table.AddToLastRow(Percentage(m.ExitsOfType(exit_type), total), 1);
    }
  }
  if (!prev_csv.empty()) {
    std::array<long long, kNumExitTypes> exits;
    exits[REC_EVAL_EXIT] = std::stoll(prev_csv["rec_eval_exits"]);
    exits[LEAF_EVAL_EXIT] = std::stoll(prev_csv["leaf_eval_exits"]);
    exits[TT_HIT_EXIT] = std::stoll(prev_csv["tt_hit_exits"]);
    exits[TT_CUTOFF_EXIT] = std::stoll(prev_csv["tt_cutoff_exits"]);
    exits[GAME_OVER_EXIT] = std::stoll(prev_csv["game_over_exits"]);
    // The total number of exits is the number of visited children across all
    // depth + 1 for the root.
    long long total = std::stoll(prev_csv["visited_children"]) + 1;
    table.AddToNewRow("Prev");
    table.AddToLastRow(total);
    table.AddToLastRow("100");
    table.AddToLastRow("|");
    for (int exit_type = 0; exit_type < kNumExitTypes; ++exit_type) {
      table.AddToLastRow(exits[exit_type]);
      table.AddToLastRow(Percentage(exits[exit_type], total), 1);
    }
  }
  std::ostringstream sout;
  sout << "Exits by depth:\n";
  table.Print(sout);
  return sout.str();
}

void AddTTReadWriteTableRow(std::string depth, long long total, long long exact,
                            long long improvement, long long useless,
                            long long miss, long long no_read, long long update,
                            long long add, long long replace,
                            long long no_write, StrTable& table1,
                            StrTable& table2) {
  table1.AddToNewRow(depth);
  table1.AddToLastRow(total);
  table1.AddToLastRow("|");
  table1.AddToLastRow(exact);
  table1.AddToLastRow(improvement);
  table1.AddToLastRow(useless);
  table1.AddToLastRow(miss);
  table1.AddToLastRow(no_read);
  table1.AddToLastRow("|");
  table1.AddToLastRow(update);
  table1.AddToLastRow(add);
  table1.AddToLastRow(replace);
  table1.AddToLastRow(no_write);

  table2.AddToNewRow(depth);
  table2.AddToLastRow("100");
  table2.AddToLastRow("|");
  table2.AddToLastRow(Percentage(exact, total), 2);
  table2.AddToLastRow(Percentage(improvement, total), 2);
  table2.AddToLastRow(Percentage(useless, total), 2);
  table2.AddToLastRow(Percentage(miss, total), 2);
  table2.AddToLastRow(Percentage(no_read, total), 2);
  table2.AddToLastRow("|");
  table2.AddToLastRow(Percentage(update, total), 2);
  table2.AddToLastRow(Percentage(add, total), 2);
  table2.AddToLastRow(Percentage(replace, total), 2);
  table2.AddToLastRow(Percentage(no_write, total), 2);
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
std::string TTReadWriteTables(std::map<std::string, std::string> prev_csv,
                              const BenchmarkMetrics& m) {
  StrTable table1, table2;
  std::vector<std::string> header_row = {
      "Depth",    "Visits", "|",      "Exact", "Improv",  "Useless", "Miss",
      "No-check", "|",      "Update", "Add",   "Replace", "No-write"};
  table1.AddToNewRow(header_row);
  table2.AddToNewRow(header_row);
  for (int depth = kMaxDepth; depth >= 0; --depth) {
    AddTTReadWriteTableRow(std::to_string(depth), m.ExitsAtDepth(depth),
                           m.TTReadsAtDepthOfType(depth, EXACT_READ),
                           m.TTReadsAtDepthOfType(depth, IMPROVEMENT_READ),
                           m.TTReadsAtDepthOfType(depth, USELESS_READ),
                           m.TTReadsAtDepthOfType(depth, MISS_READ),
                           m.TTReadsAtDepthOfType(depth, NO_READ),
                           m.TTWritesAtDepthOfType(depth, UPDATE_WRITE),
                           m.TTWritesAtDepthOfType(depth, ADD_WRITE),
                           m.TTWritesAtDepthOfType(depth, REPLACE_WRITE),
                           m.TTWritesAtDepthOfType(depth, NO_WRITE), table1,
                           table2);
  }
  table1.AddHorizontalLineRow();
  table2.AddHorizontalLineRow();
  AddTTReadWriteTableRow(
      "Sum", m.TotalExits(), m.TTReadsOfType(EXACT_READ),
      m.TTReadsOfType(IMPROVEMENT_READ), m.TTReadsOfType(USELESS_READ),
      m.TTReadsOfType(MISS_READ), m.TTReadsOfType(NO_READ),
      m.TTWritesOfType(UPDATE_WRITE), m.TTWritesOfType(ADD_WRITE),
      m.TTWritesOfType(REPLACE_WRITE), m.TTWritesOfType(NO_WRITE), table1,
      table2);
  if (!prev_csv.empty()) {
    // +1 for the root, which is not a children.
    long long total = std::stoll(prev_csv["visited_children"]) + 1;
    AddTTReadWriteTableRow(
        "Prev", total, std::stoll(prev_csv["tt_exact_reads"]),
        std::stoll(prev_csv["tt_improvement_reads"]),
        std::stoll(prev_csv["tt_useless_reads"]),
        std::stoll(prev_csv["tt_miss_reads"]),
        std::stoll(prev_csv["tt_no_reads"]),
        std::stoll(prev_csv["tt_update_writes"]),
        std::stoll(prev_csv["tt_add_writes"]),
        std::stoll(prev_csv["tt_replace_writes"]),
        std::stoll(prev_csv["tt_no_writes"]), table1, table2);
  }
  std::ostringstream sout;
  sout << "Transposition table reads and writes:\n";
  table1.Print(sout, 2);
  sout << "\nTransposition table reads and writes (%):\n";
  table2.Print(sout, 2);
  return sout.str();
}

void AddChildrenGenerationRow(const std::string& depth, long long visited,
                              long long pruned, StrTable& table) {
  long long generated = visited + pruned;
  table.AddToNewRow(depth);
  table.AddToLastRow(generated);
  table.AddToLastRow("|");
  table.AddToLastRow(visited);
  table.AddToLastRow(Percentage(visited, generated), 1);
  table.AddToLastRow(pruned);
  table.AddToLastRow(Percentage(pruned, generated), 1);
}

std::string ChildGenerationTable(std::map<std::string, std::string> prev_csv,
                                 const BenchmarkMetrics& m) {
  StrTable table;
  table.AddToNewRow({"Depth", "Generated", "|", "Visited", "%", "Pruned", "%"});
  // Skips depth 0, where no children are generated.
  for (int depth = kMaxDepth; depth >= 1; --depth) {
    long long visited = m.VisitedChildrenAtDepth(depth);
    long long pruned = m.PrunedChildrenAtDepth(depth);
    AddChildrenGenerationRow(std::to_string(depth), visited, pruned, table);
  }
  table.AddHorizontalLineRow();
  {
    long long visited = m.TotalVisitedChildren();
    long long pruned = m.TotalPrunedChildren();
    AddChildrenGenerationRow("Sum", visited, pruned, table);
  }
  if (!prev_csv.empty()) {
    long long visited = std::stoll(prev_csv["visited_children"]);
    long long pruned = std::stoll(prev_csv["pruned_children"]);
    AddChildrenGenerationRow("Prev", visited, pruned, table);
  }
  std::ostringstream sout;
  sout << "Generated children by depth:\n";
  table.Print(sout, 2);
  return sout.str();
}

// Returns all the values in a column across two tables, without duplicates.
// Skips first (header) row in each table. Preserves the order of table1,
// followed by new entries from table 2 in order.
std::vector<std::string> ColumnUnion(
    const std::vector<std::vector<std::string>>& table1,
    const std::vector<std::vector<std::string>>& table2, int col) {
  std::vector<std::string> res;
  for (size_t i = 1; i < table1.size(); ++i) {
    std::string entry = table1[i][col];
    if (find(res.begin(), res.end(), entry) == res.end()) {
      res.push_back(entry);
    }
  }
  for (size_t i = 1; i < table2.size(); ++i) {
    std::string entry = table2[i][col];
    if (find(res.begin(), res.end(), entry) == res.end()) {
      res.push_back(entry);
    }
  }
  return res;
}

std::string ComparisonTable(
    const std::string& prev_name,
    const std::vector<std::vector<std::string>>& prev_csv_table,
    const std::vector<std::vector<std::string>>& curr_csv_table,
    std::map<std::string, std::map<std::string, std::string>> prev_csv_map,
    std::map<std::string, std::map<std::string, std::string>> curr_csv_map) {
  StrTable table;
  table.AddToNewRow({"Situation", "|", "move", "", "|", "time", "", "|",
                     "graph_p", "", "|", "visited", "", "|", "pruned", ""});

  std::vector<std::string> sits =
      ColumnUnion(prev_csv_table, curr_csv_table, 0);
  for (const auto& sit : sits) {
    std::map<std::string, std::string> prev_map = prev_csv_map[sit],
                                       curr_map = curr_csv_map[sit];
    table.AddToNewRow(
        {sit, "|", prev_map["move"], curr_map["move"], "|",
         prev_map["runtime_ms"], curr_map["runtime_ms"], "|",
         prev_map["graph_primitives"], curr_map["graph_primitives"], "|",
         prev_map["visited_children"], curr_map["visited_children"], "|",
         prev_map["pruned_children"], curr_map["pruned_children"]});
  }

  std::ostringstream sout;
  sout << "Before (" << prev_name << ") vs now:\n";
  table.Print(sout, 2);
  return sout.str();
}

// `benchmark_metrics` is a global variable. This function assumes that it has
// been set as a result of the AI finding a move in a situation.
std::string BenchmarkMetricsReport(std::map<std::string, std::string> prev_csv,
                                   const BenchmarkMetrics& m) {
  std::ostringstream sout;
  long long ms = m.wall_clock_time_ms;
  long long gp = m.graph_primitives;
  sout << "Duration (ms): " << ms << '\n' << "Graph primitives: " << gp;
  if (ms > 0) sout << " (" << gp / ms << "/ms)";
  sout << "\n\n"
       << ExitTypeTable(prev_csv, m) << '\n'
       << TTReadWriteTables(prev_csv, m) << '\n'
       << ChildGenerationTable(prev_csv, m);
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

// Runs the AI to find a move in an RxC board after playing some moves
// specified in standard notation, setting `benchmark_metrics` in the process.
// Then, uses `benchmark_metrics` to generate benchmarking reports.
template <int R, int C>
void BenchmarkSituation(
    std::ostream& report_out, std::ostream& csv_out,
    std::map<std::string, std::map<std::string, std::string>> prev_csv_map,
    std::string sit_name, std::string standard_notation) {
  Situation<R, C> sit = ParseSituationOrCrash<R, C>(standard_notation);
  std::vector<BenchmarkMetrics> samples;
  std::string move = "";
  StreamAndStdOut(report_out, "Situation: " + sit_name);
  for (int i = 0; i < kNumBenchmarkSamples; ++i) {
    Negamax<R, C> negamaxer;
    auto move_metrics = negamaxer.GetMoveWithMetrics(sit);
    std::string m = sit.MoveToString(move_metrics.first);
    if (move == "")
      move = m;
    else if (move != m) {
      std::cerr << "Warning: changed move " << move << " -> " << m << std::endl;
    }
    StreamAndStdOut(report_out, "Chosen move " + std::to_string(i + 1) + ": " +
                                    sit.MoveToString(move_metrics.first));
    samples.push_back(move_metrics.second);
  }
  BenchmarkMetrics avg_metrics = AverageMetrics(samples);
  StreamAndStdOut(report_out,
                  BenchmarkMetricsReport(prev_csv_map[sit_name], avg_metrics));
  csv_out << CsvRow(sit_name, move, avg_metrics);
}

void BenchmarkSituations(
    std::ostringstream& report_out, std::ostringstream& csv_out,
    std::map<std::string, std::map<std::string, std::string>> prev_csv_map) {
  // StreamAndStdOutEmptyLine(report_out);
  // StreamAndStdOut(report_out, DimensionsSettings<10, 12>());
  // BenchmarkSituation<10, 12>(report_out, csv_out, prev_csv_map,
  //                            "Start-position", "");
  // BenchmarkSituation<10, 12>(report_out, csv_out, prev_csv_map,
  //                            "Trident-opening", "1. b2 2. b3v c2>");

  StreamAndStdOutEmptyLine(report_out);
  StreamAndStdOut(report_out, DimensionsSettings<4, 4>());
  BenchmarkSituation<4, 4>(report_out, csv_out, prev_csv_map, "Empty-4x4", "");

  StreamAndStdOutEmptyLine(report_out);
  // StreamAndStdOut(report_out, DimensionsSettings<6, 9>());
  // BenchmarkSituation<6, 9>(
  //     report_out, csv_out, prev_csv_map, "Tim-puzzle",
  //     "1. g3v h3v 2. b3v c3v 3. e3v f3v 4. c4> d3v 5. f4> f5> 6. c5> c6> 7. "
  //     "f1> f6> 8. c1> c2> 9. a2 f2> 10. h2> h3>");
}

// Returns a map from the values in a column to the row index. Assumes that the
// row's values are unique. Skips first (header) row.
std::map<std::string, int> ColumnValueToRowIndex(
    const std::vector<std::vector<std::string>>& table, int col) {
  std::map<std::string, int> res;
  for (size_t i = 1; i < table.size(); ++i) {
    res[table[i][col]] = i;
  }
  return res;
}

// Returns a map from column names to values for a given row.
std::map<std::string, std::string> ColumnNameToRowValues(
    const std::vector<std::vector<std::string>>& table, int row) {
  std::map<std::string, std::string> res;
  for (size_t j = 0; j < table[0].size(); ++j) {
    res[table[0][j]] = table[row][j];
  }
  return res;
}

// Given a csv table, returns a map with one entry for each row, with the values
// in column `col` as keys, and, as values, a map from column names to row
// values.
std::map<std::string, std::map<std::string, std::string>> CsvMap(
    const std::vector<std::vector<std::string>>& csv_table, int col) {
  std::map<std::string, std::map<std::string, std::string>> res;
  std::map<std::string, int> col_to_index =
      ColumnValueToRowIndex(csv_table, col);
  for (const auto& p : col_to_index) {
    res[p.first] = ColumnNameToRowValues(csv_table, p.second);
  }
  return res;
}

}  // namespace benchmark_internal

// Creates two files: 1. ../benchmark_out/{timestamp}.txt: a human-readable
// report with metadata and vertically aligned text tables. This report is also
// printed to standard output. 2. ../benchmark_out/{timestamp}.csv: the raw data
// in csv format, for easy computer parsing. The csv has one row per benchmark
// situation and one column per metric.
// `description` is a short string describing what is being benchmarked (e.g.,
// the name of a newly implemented optimization). It is included in the
// human-readable report. If `prev_csv_file` is not-empty, the report will
// contain additional information comparing this benchmark to another benchmark.
// The comparison file should be a csv file created previously by this
// benchmark.
void RunBenchmark(const std::string& description,
                  const std::string& prev_csv_file) {
  using namespace benchmark_internal;
  const std::string benchmark_dir = "../benchmark_out/";

  if (!wallwars::Tests::RunTests()) {
    std::cout << "Benchmark did not start due to failing tests." << std::endl;
  }

  std::vector<std::vector<std::string>> prev_csv_table;
  std::map<std::string, std::map<std::string, std::string>> prev_csv_map;
  if (!prev_csv_file.empty()) {
    std::string prev_csv_file_path = benchmark_dir + prev_csv_file;
    prev_csv_table = ParseCsv(FileToStr(prev_csv_file_path));
    prev_csv_map = CsvMap(prev_csv_table, 0);
  }

  std::ostringstream report_out;
  std::ostringstream csv_out;
  csv_out << CsvHeaderRow();

  std::string timestamp = CurrentTimestamp();
  StreamAndStdOut(report_out, BenchmarkSettings(description, timestamp));

  std::ostringstream sit_out;
  BenchmarkSituations(sit_out, csv_out, prev_csv_map);

  if (!prev_csv_file.empty()) {
    std::vector<std::vector<std::string>> curr_csv_table =
        ParseCsv(csv_out.str());
    std::map<std::string, std::map<std::string, std::string>> curr_csv_map =
        CsvMap(curr_csv_table, 0);
    StreamAndStdOut(report_out, ComparisonTable(prev_csv_file, prev_csv_table,
                                                curr_csv_table, prev_csv_map,
                                                curr_csv_map));
  }

  report_out << sit_out.str();

  // Put the benchmark results in `benchmark_dir`.
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