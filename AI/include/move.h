

#ifndef MOVE_H_
#define MOVE_H_

#include <array>
#include <ostream>
#include <string>

struct Move {
  // The difference {position after move} - {position before move}. For
  // instance, `token_change` is 0 if the move consists of deactivating two
  // edges.
  int token_change = -1234;  // Uninitialized value.

  // Edges deactivated by the move, or -1.
  std::array<int, 2> edges;

  bool operator==(const Move& rhs) const {
    return (token_change == rhs.token_change && edges == rhs.edges);
  }
  bool operator!=(const Move& rhs) const {
    return (token_change != rhs.token_change || edges != rhs.edges);
  }
};

inline Move DoubleWalkMove(int from_node, int to_node) {
  return {to_node - from_node, {-1, -1}};
}

inline Move WalkAndBuildMove(int from_node, int to_node, int edge) {
  return {to_node - from_node, {edge, -1}};
}

inline Move DoubleBuildMove(int edge1, int edge2) {
  return {0, {edge1, edge2}};
}

inline std::ostream& operator<<(std::ostream& os, const Move& m) {
  return os << m.token_change << " (" << m.edges[0] << " " << m.edges[1] << ")";
}

struct ScoredMove {
  Move move;
  int score;

  bool operator==(const ScoredMove& rhs) const {
    return (move == rhs.move && score == rhs.score);
  }
  bool operator!=(const ScoredMove& rhs) const {
    return (move != rhs.move || score != rhs.score);
  }
};

inline std::ostream& operator<<(std::ostream& os, const ScoredMove& m) {
  return os << m.move << ": " << m.score;
}

#endif  // MOVE_H_