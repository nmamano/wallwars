#ifndef CONSTANTS_H_
#define CONSTANTS_H_

#include <array>

// The dimensions are compile time constants to optimize the space used to
// represent the graph (since we might want an AI to memorize millions of
// positions).
constexpr int kNumRows = 10;
constexpr int kNumCols = 12;

// Search depth of the Negamax AI.
constexpr int kMaxDepth = 2;

constexpr int NodeAt(int row, int col) { return row * kNumCols + col; }
constexpr int kTopLeftNode = NodeAt(0, 0);
constexpr int kTopRightNode = NodeAt(0, kNumCols - 1);
constexpr int kBottomLeftNode = NodeAt(kNumRows - 1, 0);
constexpr int kBottomRightNode = NodeAt(kNumRows - 1, kNumCols - 1);

// Start and goals of the players.
constexpr std::array<int, 2> kStarts{kTopLeftNode, kTopRightNode};
constexpr std::array<int, 2> kGoals{kBottomRightNode, kBottomLeftNode};

// Edges that are not present from the beginning. Add a -1 at the end to mark
// the end (the array will be filled with 0's after that).
constexpr std::array<int, kNumRows * kNumCols * 2> kRemovedEdges{-1};

// Indicate whether the AI should indicate alternative moves that are as good as
// the found move.
constexpr bool kShowMatchingMoves = false;

constexpr bool kBenchmark = true;

#endif  // CONSTANTS_H_