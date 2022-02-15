#include "human.h"

#include <array>
#include <iostream>
#include <map>
#include <string>

#include "Negamaxer.h"
#include "board_io.h"
#include "situation.h"

Move Human::GetMove(Situation sit) {
  static std::map<std::string, int> direction_letter_to_index = {
      {"N", 0}, {"E", 1}, {"S", 2}, {"W", 3},
      {"n", 0}, {"e", 1}, {"s", 2}, {"w", 3}};

  int remaining_action_count = 2;
  // Input token-move actions by using cardinal directions.
  int original_node = sit.tokens[sit.turn];
  std::array<int, 2> removed_edges{-1, -1};
  while (remaining_action_count > 0) {
    if (remaining_action_count < 2) PrintBoardWithEdgeIndices(sit);
    std::cout << "[P" << static_cast<int>(sit.turn) << " action "
              << 3 - remaining_action_count << "] (N/E/S/W or wall #)"
              << std::endl;
    while (true) {
      std::cout << ">> ";
      std::string s;
      std::getline(std::cin, s);
      if (s == "x") {
        Negamaxer negamaxer;
        return negamaxer.GetMove(sit);
      }
      if (direction_letter_to_index.count(s)) {
        int dir = direction_letter_to_index.at(s);
        int nbr = sit.G.NeighborInDirection(sit.tokens[sit.turn], dir);
        if (nbr == -1) {
          std::cout << "P" << sit.turn << " cannot move '" << s
                    << "'. Try again." << std::endl;
          continue;
        }
        sit.tokens[sit.turn] = static_cast<int8_t>(nbr);
        --remaining_action_count;
        break;
      } else {
        int edge;
        try {
          edge = std::stoi(s);
        } catch (const std::exception& e) {
          std::cout << "Input should be N/E/S/W or a #. Try again."
                    << std::endl;
          continue;
        }
        if (!IsRealEdge(edge)) {
          std::cout << "Cannot build wall " << edge
                    << ". It is not a valid wall number. Try again."
                    << std::endl;
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
  }
  return {sit.tokens[sit.turn] - original_node, removed_edges};
}
