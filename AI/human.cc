#include "human.h"

#include <array>
#include <iostream>
#include <map>

#include "io.h"
#include "situation.h"

Move Human::GetMove(Situation sit) {
  static std::map<char, int> direction_letter_to_index = {
      {'N', 0}, {'E', 1}, {'S', 2}, {'W', 3}, {'X', -1},
      {'n', 0}, {'e', 1}, {'s', 2}, {'w', 3}, {'x', -1}};

  int remaining_action_count = 2;
  // Input token-move actions by using cardinal directions.
  bool end_token_moves = false;
  int original_node = sit.tokens[sit.turn];
  while (remaining_action_count > 0 && !end_token_moves) {
    if (remaining_action_count < 2) PrintBoard(sit);
    std::cout << "[P" << sit.turn << " token move "
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
      int nbr = sit.G.NeighborInDirection(sit.tokens[sit.turn], dir);
      if (nbr == -1) {
        std::cout << "P" << sit.turn << " cannot move '" << c << "'. Try again."
                  << std::endl;
        continue;
      }
      correct_input = true;
      sit.tokens[sit.turn] = nbr;
      --remaining_action_count;
    }
  }

  // Input wall moves using wall indices.
  std::array<int, 2> removed_edges{-1, -1};
  while (remaining_action_count > 0) {
    PrintBoard(sit);
    std::cout << "[P" << sit.turn << " wall " << 3 - remaining_action_count
              << "]" << std::endl;
    while (true) {
      std::cout << ">> ";
      int edge;
      std::cin >> edge;
      if (!IsRealEdge(edge)) {
        std::cout << "Cannot build wall " << edge
                  << ". It is not a valid wall number. Try again." << std::endl;
      } else if (!sit.G.edges[edge]) {
        std::cout << "Cannot build wall " << edge
                  << ". It is already built. Try again." << std::endl;
      } else if (!sit.CanDeactivateEdge(edge)) {
        std::cout
            << "Cannot build wall " << edge
            << ". A player wouldn't be able to reach their goal. Try again."
            << std::endl;
      } else {
        removed_edges[2 - remaining_action_count] = edge;
        sit.G.DeactivateEdge(edge);
        --remaining_action_count;
        break;
      }
    }
  }
  return {sit.tokens[sit.turn] - original_node, removed_edges};
}
