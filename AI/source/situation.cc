#include "situation.h"

#include <array>
#include <cassert>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "constants.h"
#include "graph.h"
#include "macros.h"

Situation::Situation()
    : tokens(
          {static_cast<int8_t>(kStarts[0]), static_cast<int8_t>(kStarts[1])}) {}

namespace {

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
bool ConsumeToken(const std::string& token, const std::string& s, size_t& s_i) {
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
  char type;     // '.' for move, 'v' for wall below, '>' for wall to the right.
};

struct ParsedMove {
  std::vector<ParsedAction> actions;
};

bool IsValidColumnLetter(char c) {
  c = tolower(c);
  return c >= 'a' && c < 'a' + kNumCols;
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
    if (kNumRows < 10) {
      std::cout << "Could not parse row number" << std::endl;
      PrintStringWithPointer(s, s_i);
      return false;
    }
    row = 9;
  } else if (c >= '1' && c <= '9' && c < '1' + kNumRows) {
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
// and stores the parsed move in `move`. Any initial white space is skipped. If
// there is more than one action, any order of the actions is accepted. Upper
// and lowercase letters are allowed. Examples of moves: "a1", "lX", "lX a1v",
// "a1v a1>", a2> l1>", "A2> DxV".
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
// list of moves and `notated_moves` contains the list of strings corresponding
// to the moves.
bool ParseMoveList(const std::string& s, std::vector<ParsedMove>& parsed_moves,
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

Move ParsedMoveToMove(ParsedMove parsed_move, const Situation& sit) {
  int to_node = 0;
  std::vector<int> edges;
  for (const ParsedAction& parsed_action : parsed_move.actions) {
    int node = NodeAt(parsed_action.row, parsed_action.col);
    if (parsed_action.type == '.') {
      to_node = node;
    } else if (parsed_action.type == 'v') {
      edges.push_back(EdgeBelow(node));
    } else /*parsed_action.type == '>'*/ {
      edges.push_back(EdgeRight(node));
    }
  }
  Move move;
  if (edges.size() == 0) {
    move = DoubleWalkMove(sit.tokens[sit.turn], to_node);
  } else if (edges.size() == 1) {
    move = WalkAndBuildMove(sit.tokens[sit.turn], to_node, edges[0]);
  } else /*edges.size() == 2*/ {
    move = DoubleBuildMove(edges[0], edges[1]);
  }
  return move;
}

}  // namespace

bool Situation::BuildFromStandardNotationMoves(const std::string& s,
                                               Situation& sit) {
  sit = {};
  std::vector<ParsedMove> parsed_moves;
  std::vector<std::string> notated_moves;
  if (!ParseMoveList(s, parsed_moves, notated_moves)) return false;

  for (size_t i = 0; i < parsed_moves.size(); ++i) {
    ParsedMove parsed_move = parsed_moves[i];
    Move move = ParsedMoveToMove(parsed_move, sit);
    if (!sit.IsLegalMove(move)) {
      std::cout << "Could not apply move " << i + 1 << ": <" << notated_moves[i]
                << "> {" << sit.MoveToString(move) << "} [" << move << "] ("
                << parsed_move.actions[0].row << ", "
                << parsed_move.actions[0].col << ") to situation" << std::endl
                << sit;
      sit = {};
      return false;
    }
    sit.ApplyMove(move);
  }
  return true;
}

void Situation::ApplyMove(Move move) {
  DBGS(CrashIfMoveIsIllegal(move));
  for (int edge : move.edges) {
    if (edge != -1) {
      G.DeactivateEdge(edge);
    }
  }
  tokens[turn] = static_cast<int8_t>(tokens[turn] + move.token_change);
  FlipTurn();
}

void Situation::UndoMove(Move move) {
  FlipTurn();
  for (int edge : move.edges) {
    if (edge != -1) {
      assert(IsRealEdge(edge) && !G.edges[edge]);
      G.ActivateEdge(edge);
    }
  }
  tokens[turn] = static_cast<int8_t>(tokens[turn] - move.token_change);
  DBGS(CrashIfMoveIsIllegal(move));
}

bool Situation::CanDeactivateEdge(int edge) const {
  if (!G.edges[edge]) return false;  // Already inactive.
  auto clone = *this;
  clone.G.DeactivateEdge(edge);
  bool players_can_reach_goals = clone.CanPlayersReachGoals();
  return players_can_reach_goals;
}

bool Situation::IsLegalMove(Move move) const {
  // Check that walls are not fake or already present.
  for (int edge : move.edges) {
    if (edge == -1) continue;
    if (!IsRealEdge(edge) || !G.edges[edge]) return false;
  }
  // Check that there is the correct number of actions.
  int src = tokens[turn];
  int dst = src + move.token_change;
  if (dst < 0 || dst >= kNumNodes) return false;
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

void Situation::CrashIfMoveIsIllegal(Move move) const {
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
    LOGV2(IsRealEdge(edge), G.edges[edge]);
  }
  std::exit(EXIT_FAILURE);
}

std::vector<Move> Situation::AllLegalMoves() const {
  Situation clone = *this;
  std::vector<Move> moves;
  int curr_node = tokens[turn];
  auto dist = G.Distances(curr_node);

  // Moves with 2 token moves. At most 8.
  for (int node = 0; node < kNumNodes; ++node) {
    if (dist[node] == 2) {
      moves.push_back(DoubleWalkMove(curr_node, node));
    }
  }

  // Moves with 1 token move and 1 edge removal. At most 4 * num_edges.
  for (int node = 0; node < kNumNodes; ++node) {
    if (dist[node] == 1) {
      clone.tokens[turn] = static_cast<int8_t>(node);
      for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
        if (IsRealEdge(edge) && clone.CanDeactivateEdge(edge)) {
          moves.push_back(WalkAndBuildMove(curr_node, node, edge));
        }
      }
    }
  }
  clone.tokens[turn] = static_cast<int8_t>(curr_node);

  // Moves with 2 edge removals. At most num_edges * num_edges.
  for (int edge1 = 0; edge1 < kNumRealAndFakeEdges; ++edge1) {
    if (IsRealEdge(edge1) && CanDeactivateEdge(edge1)) {
      clone.G.DeactivateEdge(edge1);
      for (int edge2 = edge1 + 1; edge2 < kNumRealAndFakeEdges; ++edge2) {
        if (IsRealEdge(edge2) && clone.CanDeactivateEdge(edge2)) {
          moves.push_back(DoubleBuildMove(edge1, edge2));
        }
      }
      clone.G.ActivateEdge(edge1);
    }
  }
  return moves;
}

std::string Situation::MoveToString(Move move) const {
  int start_node = TokenToMove();
  int end_node = start_node + move.token_change;
  std::string dir;
  if (NodeAbove(start_node) == end_node) dir = "N";
  if (NodeRight(start_node) == end_node) dir = "E";
  if (NodeBelow(start_node) == end_node) dir = "S";
  if (NodeLeft(start_node) == end_node) dir = "W";
  // In the case of a double token-move we need to find an ordering that makes
  // sense for the current enabled edges. That is, NE may be valid but EN may
  // not be.
  if (G.NeighborAbove(start_node) != -1) {
    int node_above = NodeAbove(start_node);
    if (G.NeighborAbove(node_above) == end_node) dir = "NN";
    if (G.NeighborRight(node_above) == end_node) dir = "NE";
    if (G.NeighborLeft(node_above) == end_node) dir = "NW";
  }
  if (G.NeighborRight(start_node) != -1) {
    int node_right = NodeRight(start_node);
    if (G.NeighborAbove(node_right) == end_node) dir = "EN";
    if (G.NeighborRight(node_right) == end_node) dir = "EE";
    if (G.NeighborBelow(node_right) == end_node) dir = "ES";
  }
  if (G.NeighborBelow(start_node) != -1) {
    int node_below = NodeBelow(start_node);
    if (G.NeighborRight(node_below) == end_node) dir = "SE";
    if (G.NeighborBelow(node_below) == end_node) dir = "SS";
    if (G.NeighborLeft(node_below) == end_node) dir = "SW";
  }
  if (G.NeighborLeft(start_node) != -1) {
    int node_left = NodeLeft(start_node);
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

std::string Situation::AsPrettyString() const {
  return "Turn: " + std::to_string(static_cast<int>(turn)) + "\n" +
         G.AsPrettyString(tokens[0], tokens[1], '0', '1');
}

void Situation::PrettyPrint() const { std::cout << AsPrettyString(); }
