#ifndef UTILS_H_
#define UTILS_H_

#include <array>
#include <chrono>
#include <ctime>
#include <fstream>
#include <iostream>
#include <map>
#include <ostream>
#include <sstream>
#include <vector>

#include "external/span.h"

namespace wallwars {

template <class T, std::size_t N>
std::ostream& operator<<(std::ostream& o, const std::array<T, N>& arr) {
  o << "[";
  bool first = true;
  for (const T& v : arr) {
    if (first)
      first = false;
    else
      o << ", ";
    o << v;
  }
  return o << "]";
}

template <class T>
std::ostream& operator<<(std::ostream& o, const nonstd::span<T>& arr) {
  o << "[";
  bool first = true;
  for (const T& v : arr) {
    if (first)
      first = false;
    else
      o << ", ";
    o << v;
  }
  return o << "]";
}

template <class T>
std::ostream& operator<<(std::ostream& o, const std::vector<T>& vec) {
  o << "[";
  bool first = true;
  for (const T& v : vec) {
    if (first)
      first = false;
    else
      o << ", ";
    o << v;
  }
  return o << "]";
}

template <typename K, typename V>
std::ostream& operator<<(std::ostream& o, const std::map<K, V>& m) {
  o << "{";
  bool first = false;
  for (const std::pair<K, V>& p : m) {
    if (first)
      first = false;
    else
      o << ", ";
    o << p.first << ": " << p.second;
  }
  return o << "}";
}

template <class T>
bool span_vec_eq(const nonstd::span<const T>& span, const std::vector<T>& vec) {
  if (span.size() != vec.size()) return false;
  for (size_t i = 0; i < span.size(); ++i) {
    if (span[i] != vec[i]) return false;
  }
  return true;
}

// Overload with swapped argument order.
template <class T>
bool span_vec_eq(const std::vector<T>& vec, const nonstd::span<const T>& span) {
  if (span.size() != vec.size()) return false;
  for (size_t i = 0; i < span.size(); ++i) {
    if (span[i] != vec[i]) return false;
  }
  return true;
}

static std::string ToStringWithPrecision(double val, const int n) {
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

  // An arbitrary unique-looking symbol to identify lines that should be turned
  // into horizontal lines.
  const std::string horizontal_line_marker = "@#@";

  void AddNewRow() { table.push_back({}); }
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
  void AddHorizontalLineRow() { table.push_back({horizontal_line_marker}); }

  void Print(std::ostream& os, int col_separation = 1) {
    int rows = table.size();
    int cols = table[0].size();
    std::vector<int> colWidths(cols, 0);
    for (int i = 0; i < rows; ++i) {
      if (table[i][0] == horizontal_line_marker) continue;
      for (int j = 0; j < cols; ++j) {
        std::string entry = j < (int)table[i].size() ? table[i][j] : "";
        colWidths[j] = std::max(colWidths[j], (int)entry.size());
      }
    }
    int total_width = col_separation * (cols - 1);
    for (int j = 0; j < cols; ++j) {
      total_width += colWidths[j];
    }
    for (int i = 0; i < rows; ++i) {
      if (table[i][0] == horizontal_line_marker) {
        for (int k = 0; k < total_width; ++k) {
          os << '-';
        }
        os << std::endl;
        continue;
      }
      for (int j = 0; j < cols; ++j) {
        std::string entry = j < (int)table[i].size() ? table[i][j] : "";
        os << entry;
        int tab = colWidths[j] - entry.size() + col_separation;
        for (int k = 0; k < tab; ++k) os << " ";
      }
      os << std::endl;
    }
  }
};

// Returns the current time in format "2022-04-17_01h17m38s".
std::string CurrentTimestamp() {
  std::map<std::string, std::string> month_to_num = {
      {"Jan", "01"}, {"Feb", "02"}, {"Mar", "03"}, {"Apr", "04"},
      {"May", "05"}, {"Jun", "06"}, {"Jul", "07"}, {"Aug", "08"},
      {"Sep", "09"}, {"Oct", "10"}, {"Nov", "11"}, {"Dec", "12"},
  };
  const auto now = std::chrono::system_clock::now();
  const std::time_t t_c = std::chrono::system_clock::to_time_t(now);

  // Format: "Mon Apr 16 11:07:28 2022\n"
  std::string t = std::ctime(&t_c);

  std::string YYYY = t.substr(t.size() - 5, 4);
  std::string MM = month_to_num[t.substr(4, 3)];
  std::string DD = t.substr(8, 2);
  std::string hh = t.substr(11, 2);
  std::string mm = t.substr(14, 2);
  std::string ss = t.substr(17, 2);
  return YYYY + "-" + MM + "-" + DD + "_" + hh + "h" + mm + "m" + ss + "s";
}

std::vector<std::vector<std::string>> ParseCsv(const std::string& s) {
  std::vector<std::vector<std::string>> res;
  std::stringstream ss(s);
  std::string line;
  while (std::getline(ss, line, '\n')) {
    res.push_back({});
    std::stringstream ss2(line);
    std::string val;
    while (std::getline(ss2, val, ',')) {
      res[res.size() - 1].push_back(val);
    }
    res[res.size() - 1].push_back(ss2.str());
  }
  return res;
}

std::string FileToStr(const std::string& file_name) {
  std::ifstream fin(file_name);
  if (!fin.is_open()) {
    std::cerr << "Could not open " << file_name << std::endl;
    std::exit(EXIT_FAILURE);
  }
  std::string s;
  std::string res;
  while (std::getline(fin, s)) {
    res += s;
    res.push_back('\n');
  }
  return res;
}

long long MillisSince(
    const std::chrono::high_resolution_clock::time_point& start) {
  auto now = std::chrono::high_resolution_clock::now();
  return std::chrono::duration_cast<std::chrono::milliseconds>(now - start)
      .count();
}

}  // namespace wallwars

#endif  // UTILS_H_