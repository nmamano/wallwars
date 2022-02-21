#ifndef TEMPLATE_UTILS_H_
#define TEMPLATE_UTILS_H_

#include <array>
#include <iostream>
#include <iterator>
#include <map>
#include <ostream>
#include <vector>

#include "external/span.h"

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
  return span_vec_eq(span, vec);
}

// Printer helper for failed tests.
template <class T>
void PrintDiscrepancy(const T& actual, const T& expected) {
  std::cerr << "Actual:   " << actual << "\nExpected: " << expected << '\n';
}

#endif  // TEMPLATE_UTILS_H_