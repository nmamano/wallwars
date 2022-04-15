#ifndef SITUATION_H_
#define SITUATION_H_

#include <array>
#include <bitset>
#include <cassert>
#include <cstdlib>
#include <iostream>
#include <ostream>
#include <string>
#include <vector>

#include "graph.h"
#include "macro_utils.h"
#include "move.h"

namespace wallwars {

// An upper bound on the number of legal moves.
constexpr int MaxNumLegalMoves(int R, int C) {
  return 8 + 4 * NumRealEdges(R, C) + NumRealEdges(R, C) * NumRealEdges(R, C);
}

// Start and goals of the players.
constexpr std::array<int, 2> Starts(int C) {
  return {TopLeftNode(), TopRightNode(C)};
}
constexpr std::array<int, 2> Goals(int R, int C) {
  return {BottomRightNode(R, C), BottomLeftNode(R, C)};
}

// A game position. Called "Situation" because Position could be confused with a
// cell in the board.
template <int R, int C>
struct Situation {
  // Constructs the initial situation: the players are in the corner, all edges
  // are active, and it is P0's turn.
  Situation()
      : tokens({static_cast<int8_t>(Starts(C)[0]),
                static_cast<int8_t>(Starts(C)[1])}) {}

  void Reset() {
    tokens = {static_cast<int8_t>(Starts(C)[0]),
              static_cast<int8_t>(Starts(C)[1])};
    turn = 0;
    G = {};
  }

  // Initializes `this` Situation by applying a string `s` representing a valid
  // sequence of moves in standard notation to the starting situation. For
  // example: "1. b2 2. b3v c2>". Returns whether `s` is parsed correctly, in
  // which case `this` is set to the resulting situation.
  bool BuildFromStandardNotationMoves(const std::string& s) {
    Reset();
    std::vector<ParsedMove> parsed_moves;
    std::vector<std::string> notated_moves;
    if (!ParseMoveList(s, parsed_moves, notated_moves)) return false;

    for (size_t i = 0; i < parsed_moves.size(); ++i) {
      ParsedMove parsed_move = parsed_moves[i];
      Move move = ParsedMoveToMove(parsed_move);
      if (!IsLegalMove(move)) {
        std::cout << "Could not apply move " << i + 1 << ", "
                  << notated_moves[i] << ": " << move << std::endl;
        Reset();
        return false;
      }
      ApplyMove(move);
    }
    return true;
  }

  // Since situations are used as keys in the memoization map, we use a compact
  // representation.
  // p0 and p1. 8 bits suffice for boards up to 10x12.
  std::array<int8_t, 2> tokens;
  int8_t turn = 0;  // Index of the player to move; 0 or 1.
  Graph<R, C> G;

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

  void ApplyMove(Move move) {
    DBGS(CrashIfMoveIsIllegal(move));
    for (int edge : move.edges) {
      if (edge != -1) {
        G.DeactivateEdge(edge);
      }
    }
    tokens[turn] = static_cast<int8_t>(tokens[turn] + move.token_change);
    FlipTurn();
  }
  void UndoMove(Move move) {
    FlipTurn();
    for (int edge : move.edges) {
      if (edge != -1) {
        assert(IsRealEdge(R, C, edge) && !G.edges[edge]);
        G.ActivateEdge(edge);
      }
    }
    tokens[turn] = static_cast<int8_t>(tokens[turn] - move.token_change);
    DBGS(CrashIfMoveIsIllegal(move));
  }

  inline bool IsGameOver() const {
    return tokens[0] == Goals(R, C)[0] || tokens[1] == Goals(R, C)[1];
  }

  // Return 0 if player 0 won, 1 if player 1 won, 2 if there is a draw because
  // player 0 reached the goal but player 1 is within distance 2 of the goal, or
  // -1 if nobody won.
  inline int Winner() const {
    if (tokens[1] == Goals(R, C)[1]) return true;
    if (tokens[0] == Goals(R, C)[0]) {
      return G.Distance(tokens[1], Goals(R, C)[1]) > 2 ? 0 : 2;  // 2 means draw
    }
    return -1;
  }

  inline bool CanPlayersReachGoals() const {
    return G.Distance(tokens[0], Goals(R, C)[0]) != -1 &&
           G.Distance(tokens[1], Goals(R, C)[1]) != -1;
  }

  bool CanDeactivateEdge(int edge) const {
    if (!G.edges[edge]) return false;  // Already inactive.
    auto clone = *this;
    clone.G.DeactivateEdge(edge);
    bool players_can_reach_goals = clone.CanPlayersReachGoals();
    return players_can_reach_goals;
  }
  bool IsLegalMove(Move move) const {
    // Check that walls are not fake or already present.
    for (int edge : move.edges) {
      if (edge == -1) continue;
      if (!IsRealEdge(R, C, edge) || !G.edges[edge]) return false;
    }
    // Check that there is the correct number of actions.
    int src = tokens[turn];
    int dst = src + move.token_change;
    if (dst < 0 || dst >= NumNodes(R, C)) return false;
    int token_move_actions = G.Distance(src, dst);
    int build_actions = 0;
    for (int edge : move.edges) {
      if (edge != -1) ++build_actions;
    }
    if (build_actions + token_move_actions != 2) {
      return false;
    }
    // Check that player-goal paths are not blocked by new walls.
    if (build_actions == 0) {
      return true;
    }
    auto clone = *this;
    if (build_actions == 1) {
      clone.tokens[turn] = static_cast<int8_t>(dst);
      for (int edge : move.edges) {
        if (edge != -1 && !clone.CanDeactivateEdge(edge)) return false;
      }
      return true;
    }
    // Case: build_actions == 2
    for (int edge : move.edges) {
      clone.G.DeactivateEdge(edge);
    }
    return clone.CanPlayersReachGoals();
  }

  void CrashIfMoveIsIllegal(Move move) const {
    if (IsLegalMove(move)) return;
    LOG("Illegal move");
    PrettyPrint();
    LOGV(move);
    int src = tokens[turn];
    int dst = src + move.token_change;
    LOGV3(src, dst, G.Distance(src, dst));
    for (int edge : move.edges) {
      if (edge == -1) continue;
      LOGV(edge);
    }
    std::exit(EXIT_FAILURE);
  }

  inline int TokenToMove() const { return tokens[turn]; }

  std::vector<Move> AllLegalMoves() const {
    Situation clone = *this;
    std::vector<Move> moves;
    int curr_node = tokens[turn];
    auto dist = G.Distances(curr_node);

    // Moves with 2 token moves. At most 8.
    for (int node = 0; node < NumNodes(R, C); ++node) {
      if (dist[node] == 2) {
        moves.push_back(DoubleWalkMove(curr_node, node));
      }
    }

    // Moves with 1 token move and 1 edge removal. At most 4 * num_edges.
    for (int node = 0; node < NumNodes(R, C); ++node) {
      if (dist[node] == 1) {
        clone.tokens[turn] = static_cast<int8_t>(node);
        for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
          if (IsRealEdge(R, C, edge) && clone.CanDeactivateEdge(edge)) {
            moves.push_back(WalkAndBuildMove(curr_node, node, edge));
          }
        }
      }
    }
    clone.tokens[turn] = static_cast<int8_t>(curr_node);

    // Moves with 2 edge removals. At most num_edges * num_edges.
    for (int edge1 = 0; edge1 < NumRealAndFakeEdges(R, C); ++edge1) {
      if (IsRealEdge(R, C, edge1) && CanDeactivateEdge(edge1)) {
        clone.G.DeactivateEdge(edge1);
        for (int edge2 = edge1 + 1; edge2 < NumRealAndFakeEdges(R, C);
             ++edge2) {
          if (IsRealEdge(R, C, edge2) && clone.CanDeactivateEdge(edge2)) {
            moves.push_back(DoubleBuildMove(edge1, edge2));
          }
        }
        clone.G.ActivateEdge(edge1);
      }
    }
    return moves;
  }

  std::string AsPrettyString() const {
    return "Turn: " + std::to_string(static_cast<int>(turn)) + "\n" +
           G.AsPrettyString(tokens[0], tokens[1], '0', '1');
  }

  // Prints the situation as a pretty string to the standard output.
  void PrettyPrint() const { std::cout << AsPrettyString(); }

  // Returns a string representing a move assuming that the move can be played
  // on the situation.
  std::string MoveToString(Move move) const {
    int start_node = TokenToMove();
    int end_node = start_node + move.token_change;
    std::string dir;
    if (NodeAbove(C, start_node) == end_node) dir = "N";
    if (NodeRight(C, start_node) == end_node) dir = "E";
    if (NodeBelow(R, C, start_node) == end_node) dir = "S";
    if (NodeLeft(C, start_node) == end_node) dir = "W";
    // In the case of a double token-move we need to find an ordering that makes
    // sense for the current enabled edges. That is, NE may be valid but EN may
    // not be.
    if (G.NeighborAbove(start_node) != -1) {
      int node_above = NodeAbove(C, start_node);
      if (G.NeighborAbove(node_above) == end_node) dir = "NN";
      if (G.NeighborRight(node_above) == end_node) dir = "NE";
      if (G.NeighborLeft(node_above) == end_node) dir = "NW";
    }
    if (G.NeighborRight(start_node) != -1) {
      int node_right = NodeRight(C, start_node);
      if (G.NeighborAbove(node_right) == end_node) dir = "EN";
      if (G.NeighborRight(node_right) == end_node) dir = "EE";
      if (G.NeighborBelow(node_right) == end_node) dir = "ES";
    }
    if (G.NeighborBelow(start_node) != -1) {
      int node_below = NodeBelow(R, C, start_node);
      if (G.NeighborRight(node_below) == end_node) dir = "SE";
      if (G.NeighborBelow(node_below) == end_node) dir = "SS";
      if (G.NeighborLeft(node_below) == end_node) dir = "SW";
    }
    if (G.NeighborLeft(start_node) != -1) {
      int node_left = NodeLeft(C, start_node);
      if (G.NeighborAbove(node_left) == end_node) dir = "WN";
      if (G.NeighborBelow(node_left) == end_node) dir = "WS";
      if (G.NeighborLeft(node_left) == end_node) dir = "WW";
    }
    std::string move_str = dir;
    for (int edge : move.edges) {
      if (edge != -1) {
        if (!move_str.empty()) move_str += " ";
        move_str += std::to_string(edge);
      }
    }
    return "(" + move_str + ")";
  }

  // todo: clean up the padding logic.
  void PrintBoardWithEdgeIndices() const {
    int p0 = tokens[0], p1 = tokens[1];
    int g0 = Goals(R, C)[0], g1 = Goals(R, C)[1];
    // First, find the maximum column width.
    std::size_t max_col_width = 2;
    for (int row = 0; row < R; ++row) {
      for (int col = 0; col < C; ++col) {
        int node = NodeAt(C, row, col);
        std::size_t node_width = 0;
        if (p0 == node) node_width += 2;
        if (g0 == node) node_width += 2;
        if (p1 == node) node_width += 2;
        if (g1 == node) node_width += 2;
        max_col_width = std::max(max_col_width, node_width);
      }
    }
    // The maximum column width may also be determined by the index of a
    // horizontal wall.
    max_col_width = std::max(max_col_width,
                             std::to_string(NumRealAndFakeEdges(R, C)).size());
    std::cout << "+" << std::string((max_col_width + 5) * C - 1, '-') << "+"
              << std::endl;
    for (int row = 0; row < R; ++row) {
      std::cout << "|  ";
      // One line for cells and horizontal edges.
      for (int col = 0; col < C; ++col) {
        int node = NodeAt(C, row, col);
        std::string node_str = "";
        if (p0 == node) node_str += "p0";
        if (g0 == node) node_str += "g0";
        if (p1 == node) node_str += "p1";
        if (g1 == node) node_str += "g1";
        int left_padding = -1, right_padding = -1;
        if (max_col_width % 2 == 0) {
          left_padding = (max_col_width - node_str.size()) / 2;
          right_padding = (max_col_width - node_str.size()) / 2;
        } else {
          left_padding = (max_col_width - node_str.size()) / 2;
          right_padding = (max_col_width - node_str.size()) / 2 + 1;
        }
        std::cout << std::string(left_padding, ' ') << node_str
                  << std::string(right_padding, ' ');

        // Horizontal edge to the right. Horizontal edges always have a width of
        // 5 characters.
        if (col == C - 1) continue;
        int edge = EdgeRight(C, node);
        if (!G.edges[edge]) {
          std::cout << "  |  ";
          continue;
        }
        // Find necessary padding for a width of 5.
        if (edge < 10) {
          left_padding = 2;
          right_padding = 2;
        } else if (edge < 100) {
          left_padding = 1;
          right_padding = 2;
        } else {
          left_padding = 1;
          right_padding = 1;
        }
        std::cout << std::string(left_padding, ' ') << edge
                  << std::string(right_padding, ' ');
      }
      std::cout << "  |" << std::endl;

      // One line for vertical edges and pillars between 4 walls.
      if (row == R - 1) continue;
      std::cout << "|";
      for (int col = 0; col < C; ++col) {
        int node = NodeAt(C, row, col);
        int edge = EdgeBelow(R, C, node);
        if (col == 0) {
          if (!G.edges[edge])
            std::cout << "--";
          else
            std::cout << "  ";
        }
        if (!G.edges[edge]) {
          std::cout << std::string(max_col_width, '-');
        } else {
          // Find necessary padding for a width of `max_col_width`.
          int left_padding, right_padding;
          if (max_col_width % 2 == 0) {
            if (edge < 10) {
              left_padding = max_col_width / 2 - 1;
              right_padding = max_col_width / 2;
            } else if (edge < 100) {
              left_padding = max_col_width / 2 - 1;
              right_padding = max_col_width / 2 - 1;
            } else {
              left_padding = max_col_width / 2 - 2,
              right_padding = max_col_width / 2 - 1;
            }
          } else {
            if (edge < 10) {
              left_padding = max_col_width / 2;
              right_padding = max_col_width / 2;
            } else if (edge < 100) {
              left_padding = max_col_width / 2 - 1;
              right_padding = max_col_width / 2;
            } else {
              left_padding = max_col_width / 2 - 1;
              right_padding = max_col_width / 2 - 1;
            }
          }
          std::cout << std::string(left_padding, ' ') << edge
                    << std::string(right_padding, ' ');
        }
        // "Pillar" between 4 walls.
        if (col < C - 1) {
          int next_edge = EdgeBelow(R, C, NodeRight(C, node));
          if (!G.edges[edge] && !G.edges[next_edge]) {
            std::cout << "--+--";
          } else if (!G.edges[edge] && G.edges[next_edge]) {
            std::cout << "--+  ";

          } else if (G.edges[edge] && !G.edges[next_edge]) {
            std::cout << "  +--";
          } else {
            std::cout << "  +  ";
          }
        } else {
          if (!G.edges[edge])
            std::cout << "--";
          else
            std::cout << "  ";
        }
      }
      std::cout << "|" << std::endl;
    }
    std::cout << "+" << std::string((max_col_width + 5) * C - 1, '-') << "+"
              << std::endl;
  }

 private:
  bool IsWhiteSpace(char c) { return c == ' ' || c == '\t' || c == '\n'; }

  // Advances `s_i` while it is at a white space character.
  void SkipWhiteSpace(const std::string& s, size_t& s_i) {
    while (s_i < s.size() && IsWhiteSpace(s[s_i])) ++s_i;
  }

  void PrintStringWithPointer(const std::string& s, size_t s_i) {
    bool single_line_fits = s.size() < 80 && s.find('\n') == std::string::npos;
    if (single_line_fits) {
      std::cout << s << std::endl;
      std::string space(s_i, ' ');
      std::cout << space << '^' << std::endl;
    } else {
      std::cout << s.substr(0, s_i) << '#' << s.substr(s_i) << std::endl;
    }
  }
  // Advances `s_i`, an index in `s`, until after `token`. It skips white spaces
  // before `token`. Returns false if anything other than white spaces followed
  // by `token` is encountered, or if `s` ends before the token is found.
  bool ConsumeToken(const std::string& token, const std::string& s,
                    size_t& s_i) {
    SkipWhiteSpace(s, s_i);
    if (s.find(token, s_i) != s_i) {
      std::cout << "Could not parse token '" << token << "'" << std::endl;
      PrintStringWithPointer(s, s_i);
      return false;
    }
    s_i += token.size();
    return true;
  }

  // Returns whether there is only white space in `s` at and after `s[s_i]`.
  // Advances `s_i` over white space.
  bool IsDoneParsing(const std::string& s, size_t& s_i) {
    SkipWhiteSpace(s, s_i);
    return s_i == s.size();
  }

  struct ParsedAction {
    int col, row;  // 0-indexed.
    char type;  // '.' for move, 'v' for wall below, '>' for wall to the right.
  };

  struct ParsedMove {
    std::vector<ParsedAction> actions;
  };

  bool IsValidColumnLetter(char c) {
    c = tolower(c);
    return c >= 'a' && c < 'a' + C;
  }

  bool ParseColumnLetter(const std::string& s, size_t& s_i, int& col) {
    if (s_i == s.size() || !IsValidColumnLetter(s[s_i])) {
      std::cout << "Could not parse column letter" << std::endl;
      PrintStringWithPointer(s, s_i);
      return false;
    }
    col = tolower(s[s_i]) - 'a';
    ++s_i;
    return true;
  }

  bool ParseRowNumber(const std::string& s, size_t& s_i, int& row) {
    if (s_i == s.size()) {
      std::cout << "Could not parse row number" << std::endl;
      PrintStringWithPointer(s, s_i);
      return false;
    }
    char c = tolower(s[s_i]);
    if (c == 'x') {
      if (R < 10) {
        std::cout << "Could not parse row number" << std::endl;
        PrintStringWithPointer(s, s_i);
        return false;
      }
      row = 9;
    } else if (c >= '1' && c <= '9' && c < '1' + R) {
      row = c - '1';
    } else {
      std::cout << "Could not parse row number" << std::endl;
      PrintStringWithPointer(s, s_i);
      return false;
    }
    ++s_i;
    return true;
  }

  bool IsDoneParsingMove(const std::string& s, size_t& s_i) {
    SkipWhiteSpace(s, s_i);
    return s_i == s.size() || !IsValidColumnLetter(s[s_i]);
  }

  bool ParseAction(const std::string& s, size_t& s_i, ParsedAction& action) {
    SkipWhiteSpace(s, s_i);
    if (!ParseColumnLetter(s, s_i, action.col)) return false;
    if (!ParseRowNumber(s, s_i, action.row)) return false;
    if (s_i < s.size()) {
      char c = tolower(s[s_i]);
      if (c == 'v' || c == '>') {
        action.type = c;
        ++s_i;
      } else {
        action.type = '.';
      }
    }
    return true;
  }

  // Parses a move in standard notation starting at s[s_i]. Returns false if
  // parsing fails. Otherwise, returns true, moves i to after the parsed string
  // and stores the parsed move in `move`. Any initial white space is skipped.
  // If there is more than one action, any order of the actions is accepted.
  // Upper and lowercase letters are allowed. Examples of moves: "a1", "lX", "lX
  // a1v", "a1v a1>", a2> l1>", "A2> DxV".
  bool ParseMove(const std::string& s, size_t& s_i, ParsedMove& move) {
    int walk_action_count = 0;
    for (int action_index = 0; !IsDoneParsingMove(s, s_i); ++action_index) {
      if (action_index == 2) {
        std::cout << "Found move with more than 2 actions while parsing"
                  << std::endl;
        PrintStringWithPointer(s, s_i);
        return false;
      }
      SkipWhiteSpace(s, s_i);
      size_t original_s_i = s_i;
      ParsedAction action;
      if (!ParseAction(s, s_i, action)) return false;
      move.actions.push_back(action);
      if (action.type == '.') ++walk_action_count;
      if (walk_action_count > 1) {
        std::cout << "Found move with more than 1 walk action while parsing"
                  << std::endl;
        PrintStringWithPointer(s, original_s_i);
        return false;
      }
    }
    return true;
  }

  // Parses a string in standard notation into the list of individual moves.
  // Returns whether parsing succeeds, in which case `parsed_moves` contains the
  // list of moves and `notated_moves` contains the list of strings
  // corresponding to the moves.
  bool ParseMoveList(const std::string& s,
                     std::vector<ParsedMove>& parsed_moves,
                     std::vector<std::string>& notated_moves) {
    size_t s_i = 0;
    for (int move_index = 1; !IsDoneParsing(s, s_i); ++move_index) {
      std::string move_number = std::to_string(move_index) + ".";
      if (!ConsumeToken(move_number, s, s_i)) return false;
      ParsedMove parsed_move;
      SkipWhiteSpace(s, s_i);
      size_t original_s_i = s_i;
      if (!ParseMove(s, s_i, parsed_move)) return false;
      parsed_moves.push_back(parsed_move);
      notated_moves.push_back(s.substr(original_s_i, s_i - original_s_i - 1));
    }
    return true;
  }

  Move ParsedMoveToMove(ParsedMove parsed_move) {
    int to_node = 0;
    std::vector<int> edges;
    for (const ParsedAction& parsed_action : parsed_move.actions) {
      int node = NodeAt(C, parsed_action.row, parsed_action.col);
      if (parsed_action.type == '.') {
        to_node = node;
      } else if (parsed_action.type == 'v') {
        edges.push_back(EdgeBelow(R, C, node));
      } else /*parsed_action.type == '>'*/ {
        edges.push_back(EdgeRight(C, node));
      }
    }
    Move move;
    if (edges.size() == 0) {
      move = DoubleWalkMove(tokens[turn], to_node);
    } else if (edges.size() == 1) {
      move = WalkAndBuildMove(tokens[turn], to_node, edges[0]);
    } else /*edges.size() == 2*/ {
      move = DoubleBuildMove(edges[0], edges[1]);
    }
    return move;
  }
};

template <int R, int C>
inline std::ostream& operator<<(std::ostream& os, const Situation<R, C>& sit) {
  return os << sit.AsPrettyString();
}

// Todo: improve hash function.
template <int R, int C>
struct SituationHash {
  std::size_t operator()(const Situation<R, C>& sit) const {
    return (sit.tokens[0] | (sit.tokens[1] << 16)) ^
           std::hash<std::bitset<NumRealAndFakeEdges(R, C)>>{}(sit.G.edges);
  }
};

}  // namespace wallwars

#endif  // SITUATION_H_