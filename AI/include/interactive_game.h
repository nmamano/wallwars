#ifndef INTERACTIVE_GAME_H_
#define INTERACTIVE_GAME_H_

#include <array>
#include <chrono>
#include <ctime>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include "assert.h"
#include "benchmark_metrics.h"
#include "constants.h"
#include "graph.h"
#include "negamax.h"
#include "situation.h"

namespace wallwars {

class InteractiveGame {
 public:
  static constexpr int R = kInteractiveGameR;
  static constexpr int C = kInteractiveGameC;

  static void PlayGame() {
    InteractiveGame game;
    game.Play();
  }

 private:
  void Play() {
    std::array<bool, 2> auto_moves = {true, true};
    while (true) {
      std::string P0_type = auto_moves[0] ? "auto" : "manual";
      std::string P1_type = auto_moves[1] ? "auto" : "manual";
      std::cout << "Enter a number to choose:" << std::endl
                << "(1) Start game (" << P0_type << " vs " << P1_type << ")"
                << std::endl
                << "(2) Change P0 (current: " << P0_type << ")" << std::endl
                << "(3) Change P1 (current: " << P1_type << ")" << std::endl
                << "(4) Quit." << std::endl
                << ">> ";
      char menu_option;
      std::cin >> menu_option;
      switch (menu_option) {
        case '1':
          PlayGame(auto_moves);
          break;
        case '2':
          auto_moves[0] = !auto_moves[0];
          break;
        case '3':
          auto_moves[1] = !auto_moves[1];
          break;
        default:
          return;
      }
    }
  }

 private:
  // Asks human for a move through the CLI. If the human wants, it can defer to
  // the Negamax by inputting 'x'.
  Move GetHumanMove(Situation<R, C> sit, Negamax<R, C>& negamaxer) {
    static std::map<std::string, int> direction_letter_to_index = {
        {"N", 0}, {"E", 1}, {"S", 2}, {"W", 3},
        {"n", 0}, {"e", 1}, {"s", 2}, {"w", 3}};

    int remaining_action_count = 2;
    // Input token-move actions by using cardinal directions.
    int original_node = sit.tokens[sit.turn];
    std::array<int, 2> removed_edges{-1, -1};
    while (remaining_action_count > 0) {
      if (remaining_action_count < 2) sit.PrintBoardWithEdgeIndices();
      std::cout << "[P" << static_cast<int>(sit.turn) << " action "
                << 3 - remaining_action_count << "] (N/E/S/W or wall #)"
                << std::endl;
      while (true) {
        std::cout << ">> ";
        std::string s;
        std::getline(std::cin, s);
        if (s == "x") {
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
          if (!IsRealEdge(R, C, edge)) {
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

  void PrintWinner(const Situation<R, C>& sit) {
    if (sit.Winner() == 2) {
      std::cout << "Players drew by the one-move rule." << std::endl;
    } else {
      std::cout << "P" << sit.Winner() << " won!" << std::endl;
    }
    std::cout << "Final board:" << std::endl;
    sit.PrintBoardWithEdgeIndices();
  }

  // `auto_moves` is an array which indicates, for P0 and P1, whether
  // the AI should make the move.
  void PlayGame(std::array<bool, 2> auto_moves) {
    std::array<Negamax<R, C>, 2> negamaxers;

    Situation<R, C> sit;
    for (int ply = 0; !sit.IsGameOver(); ++ply) {
      using namespace std::chrono;
      // P0 moves on even plies, P1 moves on odd plies.
      std::string player_str = "P" + std::to_string(static_cast<int>(sit.turn));
      sit.PrintBoardWithEdgeIndices();
      std::cout << "Move " << ply << " by " << player_str
                << (auto_moves[sit.turn] ? " (auto)" : "") << std::endl;
      global_metrics = {};
      auto start_time = high_resolution_clock::now();
      Move move = auto_moves[sit.turn]
                      ? negamaxers[sit.turn].GetMove(sit)
                      : GetHumanMove(sit, negamaxers[sit.turn]);
      auto stop_time = high_resolution_clock::now();
      seconds duration_s = duration_cast<seconds>(stop_time - start_time);
      if (move == Move{0, {-1, -1}}) {
        std::cout << "Internal error" << std::endl;
        return;
      } else {
        std::cout << player_str << " played " << sit.MoveToString(move)
                  << " in " << duration_s.count() << "s." << std::endl;
        if (kBenchmark) {
          std::cout << "Graph traversal count = "
                    << global_metrics.graph_primitives << std::endl;
        }
      }
      sit.ApplyMove(move);
    }
    PrintWinner(sit);
  }
};

}  // namespace wallwars

#endif  // INTERACTIVE_GAME_H_