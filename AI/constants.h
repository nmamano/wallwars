#ifndef CONSTANTS_H_
#define CONSTANTS_H_

// Dimensions of the board.
constexpr int kNumRows = 4;
constexpr int kNumCols = 4;

// Search depth of the Negamax AI.
constexpr int kMaxDepth = 6;

constexpr int NodeAt(int row, int col) { return row * kNumCols + col; }
constexpr int kTopLeftNode = NodeAt(0, 0);
constexpr int kTopRightNode = NodeAt(0, kNumCols - 1);
constexpr int kBottomLeftNode = NodeAt(kNumRows - 1, 0);
constexpr int kBottomRightNode = NodeAt(kNumRows - 1, kNumCols - 1);

// Start and goals of the players.
constexpr std::array<int, 2> kStarts{kTopLeftNode, kTopRightNode};
constexpr std::array<int, 2> kGoals{kBottomRightNode, kBottomLeftNode};

#endif  // CONSTANTS_H_