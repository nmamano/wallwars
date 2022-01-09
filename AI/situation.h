#ifndef SITUATION_H_
#define SITUATION_H_

#include <array>
#include <bitset>
#include <ostream>
#include <string>
#include <vector>

#include "graph.h"
#include "move.h"

// The goals g0 and g1, which never change.
constexpr std::array<int, 2> kGoals{kBottomRightNode, kBottomLeftNode};

constexpr int kMaxNumLegalMoves =
    8 + 4 * kNumRealEdges + kNumRealEdges * kNumRealEdges;

// A game position. Called "Situation" because Position could be confused with a
// cell in the board.
struct Situation {
  // Constructs the initial situation: the players are in the corner, all edges
  // are active, and it is P0's turn.
  Situation();

  // Since situations are used as keys in the memoization map, we use a compact
  // representation.

  // p0 and p1. 8 bits suffice for boards up to 10x12.
  std::array<int8_t, 2> tokens;
  int8_t turn = 0;  // Index of the player to move; 0 or 1.
  Graph G;

  Situation(const Situation& other)
      : tokens(other.tokens), turn(other.turn), G(other.G) {}

  Situation& operator=(const Situation& other) {
    if (&other != this) {
      tokens = other.tokens;
      turn = other.turn;
      G = other.G;
    }
    return *this;
  }
  bool operator==(const Situation& rhs) const {
    return (tokens == rhs.tokens && turn == rhs.turn && G == rhs.G);
  }
  bool operator!=(const Situation& rhs) const { return !operator==(rhs); }

  inline void FlipTurn() { turn = (turn == 0) ? 1 : 0; }

  void ApplyMove(Move move);
  void UndoMove(Move move);

  inline bool IsGameOver() const {
    return tokens[0] == kGoals[0] || tokens[1] == kGoals[1];
  }
  inline int Winner() const {
    return IsGameOver() ? (tokens[0] == kGoals[0] ? 0 : 1) : -1;
  }

  inline bool CanPlayersReachGoals() const {
    return G.Distance(tokens[0], kGoals[0]) != -1 &&
           G.Distance(tokens[1], kGoals[1]) != -1;
  }

  bool CanDeactivateEdge(int edge) const;
  bool IsLegalMove(Move move) const;
  void CrashIfMoveIsIllegal(Move move) const;

  inline int TokenToMove() const { return tokens[turn]; }

  std::vector<Move> AllLegalMoves() const;

  std::string AsPrettyString() const;

  // Prints the situation as a pretty string to the standard output.
  void PrettyPrint() const;

  // Returns a string representing a move assuming that the move can be played
  // on the situation.
  std::string MoveToString(Move move) const;
};

inline std::ostream& operator<<(std::ostream& os, const Situation& sit) {
  return os << sit.AsPrettyString();
}

// Todo: improve hash function.
struct SituationHash {
  std::size_t operator()(const Situation& sit) const {
    return (sit.tokens[0] || sit.tokens[1] << 16) ^
           std::hash<std::bitset<kNumRealAndFakeEdges>>{}(sit.G.edges);
  }
};

#endif  // SITUATION_H_