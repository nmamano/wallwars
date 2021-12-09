#ifndef SITUATION_H_
#define SITUATION_H_

#include <array>
#include <bitset>
#include <ostream>
#include <vector>

#include "graph.h"

struct Move {
  // The difference {position after move} - {position before move}. For
  // instance, `token_change` is 0 if the move consists of deactivating two
  // edges.
  int token_change;

  // Edges deactivated by the move, or -1.
  std::array<int, 2> edges;
};

inline std::ostream& operator<<(std::ostream& os, const Move& m) {
  return os << m.token_change << " (" << m.edges[0] << " " << m.edges[1] << ")";
}

// The goals g0 and g1, which never change.
constexpr std::array<int, 2> kGoals{BottomRightNode(), BottomLeftNode()};

constexpr int kMaxNumLegalMoves =
    8 + 4 * NumRealEdges() + NumRealEdges() * NumRealEdges();

// A game position. Called "Situation" because Position could be confused with a
// cell in the board.
struct Situation {
  // Constructs the initial situation: the players are in the corner, all edges
  // are active, and it is P0's turn.
  Situation();

  std::array<int, 2> tokens;  // p0 and p1.
  int turn = 0;               // Index of the player to move; 0 or 1.
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

  inline void FlipTurn() { turn = 1 - turn; }

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

  bool CanDeactivateEdge(int edge) /*const*/;

  inline int TokenToMove() const { return tokens[turn]; }

  std::vector<Move> AllLegalMoves() /*const*/;

  void PrettyPrint() const;
  // Returns a string representing a move assuming that the move can be played
  // on the situation.
  std::string MoveAsPrettyString(Move move) const;
};

inline std::ostream& operator<<(std::ostream& os, const Situation& s) {
  return os << s.tokens[0] << " " << s.tokens[1] << " " << s.turn << " " << s.G;
}

struct SituationHash {
  std::size_t operator()(const Situation& sit) const {
    return (sit.tokens[0] || sit.tokens[1] << 16) ^
           std::hash<std::bitset<NumRealAndFakeEdges()>>{}(sit.G.edges);
  }
};

#endif  // SITUATION_H_