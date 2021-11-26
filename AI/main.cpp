#include <array>
#include <iostream>
#include <map>
#include <string>
#include <vector>

#include "graph.h"

std::array<std::array<int, 2>, 2> InitialPlayers(const Graph& G) {
  std::array<int, 2> player0{G.TopLeftNode(), G.BottomRightNode()};
  std::array<int, 2> player1{G.TopRightNode(), G.BottomLeftNode()};
  return {player0, player1};
}

bool IsGameOver(std::array<std::array<int, 2>, 2> players) {
  return players[0][0] == players[0][1] || players[1][0] == players[1][1];
}

void PrintWinner(std::array<std::array<int, 2>, 2> players) {
  std::cout << "Player " << (players[0][0] == players[0][1] ? 0 : 1) << " won!"
            << std::endl;
}

bool CanRemoveEdge(/*const*/ Graph& G,
                   std::array<std::array<int, 2>, 2> players, int edge) {
  if (!G.edges[edge]) return false;  // Already removed.
  G.RemoveEdge(edge);
  bool players_can_reach_goals =
      G.Distance(players[0][0], players[0][1]) != -1 &&
      G.Distance(players[1][0], players[1][1]) != -1;
  G.AddEdge(edge);
  return players_can_reach_goals;
}

// todo: clean up the padding logic.
void PrintBoard(const Graph& G, std::array<std::array<int, 2>, 2> players) {
  // First, find the maximum column width.
  std::size_t max_col_width = 2;
  for (int row = 0; row < G.num_rows; ++row) {
    for (int col = 0; col < G.num_cols; ++col) {
      int node = G.NodeAtCoordinates(row, col);
      std::size_t node_width = 0;
      if (players[0][0] == node) node_width += 2;
      if (players[0][1] == node) node_width += 2;
      if (players[1][0] == node) node_width += 2;
      if (players[1][1] == node) node_width += 2;
      max_col_width = std::max(max_col_width, node_width);
    }
  }
  max_col_width =
      std::max(max_col_width, std::to_string(G.NumRealAndFakeEdges()).size());

  for (int row = 0; row < G.num_rows; ++row) {
    // One line for cells and horizontal edges.
    for (int col = 0; col < G.num_cols; ++col) {
      int node = G.NodeAtCoordinates(row, col);
      std::string node_str = "";
      if (players[0][0] == node) node_str += "p0";
      if (players[0][1] == node) node_str += "g0";
      if (players[1][0] == node) node_str += "p1";
      if (players[1][1] == node) node_str += "g1";
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

      // Horizontal edge to the right. Horizontal edges always have a width of 5
      // characters.
      if (col == G.num_cols - 1) continue;
      int edge = G.EdgeRight(node);
      if (!G.edges[edge]) {
        std::cout << "  |  ";
        continue;
      }
      // Find necessary padding for a width of 5.
      left_padding = -1, right_padding = -1;
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
    std::cout << std::endl;

    // One line for vertical edges and pillars between 4 walls.
    if (row == G.num_rows - 1) continue;
    for (int col = 0; col < G.num_cols; ++col) {
      int node = G.NodeAtCoordinates(row, col);
      int edge = G.EdgeBelow(node);
      if (!G.edges[edge]) {
        std::cout << std::string(max_col_width, '-');
      } else {
        // Find necessary padding for a width of `max_col_width`.
        int left_padding = -1, right_padding = -1;
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
      if (col < G.num_cols - 1) {
        std::cout << "  +  ";
      }
    }

    std::cout << std::endl;
  }
}

void DoHumanMove(Graph& G, std::array<std::array<int, 2>, 2>& players,
                 int player_index) {
  static std::map<char, int> direction_letter_to_index = {
      {'N', 0}, {'E', 1}, {'S', 2}, {'W', 3}, {'X', -1},
      {'n', 0}, {'e', 1}, {'s', 2}, {'w', 3}, {'x', -1}};

  int remaining_action_count = 2;
  // Input token-move actions by using cardinal directions.
  bool end_token_moves = false;
  while (remaining_action_count > 0 && !end_token_moves) {
    PrintBoard(G, players);
    std::cout << "[Player " << player_index << " token move "
              << 3 - remaining_action_count << "] (N/E/S/W/X)" << std::endl;
    bool correct_input = false;
    while (!correct_input) {
      std::cout << ">> ";
      char c;
      std::cin >> c;
      if (!direction_letter_to_index.count(c)) {
        std::cout << "Input should be N/E/S/W/X. Try again." << std::endl;
        continue;
      }
      int dir = direction_letter_to_index.at(c);
      if (dir == -1) {
        end_token_moves = true;
        break;
      }
      int nbr = G.NeighborInDirection(players[player_index][0], dir);
      if (nbr == -1) {
        std::cout << "Player " << player_index << " cannot move '" << c
                  << "'. Try again." << std::endl;
        continue;
      }
      correct_input = true;
      players[player_index][0] = nbr;
      --remaining_action_count;
    }
  }
  // Input wall moves using wall indices.
  while (remaining_action_count > 0) {
    PrintBoard(G, players);
    std::cout << "[Player " << player_index << " wall "
              << 3 - remaining_action_count << "] (#)" << std::endl;
    while (true) {
      std::cout << ">> ";
      int edge;
      std::cin >> edge;
      if (!G.IsRealEdge(edge)) {
        std::cout << "Cannot build wall " << edge
                  << ". It is not a valid wall number. Try again." << std::endl;
      } else if (!G.edges[edge]) {
        std::cout << "Cannot build wall " << edge
                  << ". It is already built. Try again." << std::endl;
      } else if (!CanRemoveEdge(G, players, edge)) {
        std::cout
            << "Cannot build wall " << edge
            << ". A player wouldn't be able to reach their goal. Try again."
            << std::endl;
      } else {
        G.RemoveEdge(edge);
        --remaining_action_count;
        break;
      }
    }
  }
}

void DoComputerMove(Graph& G, std::array<std::array<int, 2>, 2>& players,
                    int player_index) {
  int& p = players[player_index][0];
  int g = players[player_index][1];
  // Naive implementation that simply walks towards the goal.
  if (G.Distance(p, g) >= 2) {
    auto dist = G.Distances(g);
    int cur_dist = dist[p];
    for (int i = 0; i < G.NumNodes(); ++i) {
      if (dist[i] == cur_dist - 2) {
        p = i;
        return;
      }
    }
  } else {
    // Edge case: the computer is at distance 1 from the goal, so, in addition
    // to moving to it, it needs to place a wall for its second action. It can
    // place the wall between its current position and the goal.
    G.RemoveEdge(G.EdgeBetween(p, g));
    p = g;
  }
}

void PlayGame(int num_rows, int num_cols, std::array<bool, 2> human_players) {
  Graph G(num_rows, num_cols);
  // Player 0 moves on even plies, player 1 moves on odd plies.
  int ply = 0;

  // p0, g0, p1, g2 correspond to indices [0][0], [0][1], [1][0], [1][1].
  std::array<std::array<int, 2>, 2> players = InitialPlayers(G);

  while (!IsGameOver(players)) {
    int player_index = ply % 2;
    bool is_human = human_players[player_index];
    std::cout << "Move " << ply + 1 << " (player " << player_index << ") ("
              << (is_human ? "human" : "computer") << ")" << std::endl;
    if (is_human) {
      DoHumanMove(G, players, player_index);
    } else {
      DoComputerMove(G, players, player_index);
    }
    ++ply;
  }
  PrintWinner(players);
  PrintBoard(G, players);
}

int main() {
  int num_rows = 5;
  int num_cols = 6;
  while (true) {
    std::cout << "Enter a number to choose:" << std::endl;
    std::cout << "(1) Play against yourself." << std::endl;
    std::cout << "(2) Play against computer." << std::endl;
    std::cout << "(3) Watch a computer play against itself." << std::endl;
    std::cout << "(4) Change the board dimensions (current: " << num_rows
              << " rows and " << num_cols << " columns)" << std::endl;
    std::cout << "(5) Quit." << std::endl;
    std::cout << ">> ";
    int option;
    std::cin >> option;
    switch (option) {
      case 1:
        PlayGame(num_rows, num_cols, {true, true});
        break;
      case 2:
        PlayGame(num_rows, num_cols, {true, false});
        break;
      case 3:
        PlayGame(num_rows, num_cols, {false, false});
        break;
      case 4:
        std::cout << "Number of rows (3-10):" << std::endl;
        do {
          std::cout << ">> ";
          std::cin >> num_rows;
        } while (num_rows < 3 || num_rows > 10);
        std::cout << "Number of columns (3-12):" << std::endl;
        do {
          std::cout << ">> ";
          std::cin >> num_cols;
        } while (num_cols < 3 || num_cols > 12);
        break;
      case 5:
      default:
        return 0;
    }
  }
  return 0;
}