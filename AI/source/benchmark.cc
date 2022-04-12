#include "benchmark.h"

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
#include "human.h"
#include "macros.h"
#include "mover.h"
#include "negamaxer.h"
#include "situation.h"
#include "walker.h"

using namespace std::chrono;

namespace {

std::string ToStringWithPrecision(double val, const int n) {
  std::ostringstream oss;
  oss.precision(n);
  bool isNan = val != val;
  if (isNan)
    oss << "N/A";
  else
    oss << std::fixed << val;
  return oss.str();
}

struct StrTable {
  std::vector<std::vector<std::string>> table;
  void AddRow() { table.push_back({}); }
  void AddToNewRow(std::string s) { table.push_back({s}); }
  void AddToNewRow(std::vector<std::string> vs) { table.push_back(vs); }
  void AddToNewRow(long long i) { AddToNewRow(std::to_string(i)); }
  void AddToLastRow(std::string s) { table.back().push_back(s); }
  void AddToLastRow(std::vector<std::string> vs) {
    table.back().insert(table.back().end(), vs.begin(), vs.end());
  }
  void AddToLastRow(long long i) { AddToLastRow(std::to_string(i)); }
  void AddToLastRow(double d, int precision) {
    AddToLastRow(ToStringWithPrecision(d, precision));
  }

  void Print(std::ostream& os, int col_separation = 1) {
    int rows = table.size();
    int cols = table[0].size();
    std::vector<int> colWidths(cols, 0);
    for (int i = 0; i < rows; i++) {
      for (int j = 0; j < cols; j++) {
        std::string entry = j < (int)table[i].size() ? table[i][j] : "";
        colWidths[j] = std::max(colWidths[j], (int)entry.size());
      }
    }
    for (int i = 0; i < rows; i++) {
      for (int j = 0; j < cols; j++) {
        std::string entry = j < (int)table[i].size() ? table[i][j] : "";
        os << entry;
        int tab = colWidths[j] - entry.size() + col_separation;
        for (int k = 0; k < tab; k++) os << " ";
      }
      os << std::endl;
    }
  }
};

std::vector<std::string> kExitTypes{"normal", "leaf-eval", "table-hit",
                                    "table-cutoff", "game-over"};

Situation ParseSituationOrCrash(std::string standard_notation) {
  Situation sit;
  if (!Situation::BuildFromStandardNotationMoves(standard_notation, sit)) {
    std::exit(EXIT_FAILURE);
  }
  return sit;
}

std::vector<std::pair<std::string, Situation>> GetBenchmarkSituations() {
  return {
      {"Start-position", Situation{}},
      {"Trident-opening", ParseSituationOrCrash("1. b2 2. b3v c2>")},
  };
}

void PrintRuntimeSettings() {
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

/* Table is read at the beginning of a visit and written at the end. When
 * reading, 4 things can happen: 1. we find that situation with exact
 * evaluation. 2. we find either an upper bound or a lower bound for the
 * evaluation. There are 3 subcases: 2.a. the bound allows an immediate
 * alpha-beta cutoff. 2.b. the bound improves the alpha-beta window (it is
 * inside the starting window). 2.c. the bound is useless (it is outside of the
 * starting window). 3. we do not find the situation in the table. 4. we do not
 * even check the table. When writing, 2 things can happen: if the situation was
 * already in the table, we overwrite it with the new evaluation. This can be an
 * exact evaluation, an upper bound, or a lower bound. If the situation was not
 * in the table, we add it. The two subcases are whether we kick out a
 * pre-existing entry or not.  */
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

}  // namespace

void RunBenchmark() {
  PrintRuntimeSettings();
  for (auto name_sit_pair : GetBenchmarkSituations()) {
    std::cout << std::endl << "Situation " << name_sit_pair.first << std::endl;
    benchmark_metrics = {};
    {
      Negamaxer negamaxer;
      Situation sit = name_sit_pair.second;
      auto start = high_resolution_clock::now();
      Move move = negamaxer.GetMove(sit);
      auto stop = high_resolution_clock::now();
      benchmark_metrics.wall_clock_time_ms =
          duration_cast<milliseconds>(stop - start).count();
      std::cerr << "Found move: " << sit.MoveToString(move) << std::endl;
    }
    std::cout << std::endl
              << "Duration (ms): " << benchmark_metrics.wall_clock_time_ms
              << std::endl;
    std::cout << "Graph primitives: " << benchmark_metrics.num_graph_primitives
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
}