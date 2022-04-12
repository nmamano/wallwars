#include <array>
#include <chrono>
#include <ctime>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

#include "assert.h"
#include "benchmark.h"
#include "benchmark_metrics.h"
#include "board_io.h"
#include "graph.h"
#include "human.h"
#include "mover.h"
#include "negamaxer.h"
#include "situation.h"
#include "tests.h"
#include "walker.h"

using namespace std::chrono;

BenchmarkMetrics benchmark_metrics;

std::vector<std::string> kMoverStrs = {"Human", "Walker", "Negamaxer"};

int MoverStrToInt(std::string mover_str) {
  for (size_t i = 0; i < kMoverStrs.size(); i++) {
    if (kMoverStrs[i] == mover_str) return i;
  }
  return -1;
}

std::unique_ptr<Mover> GetMover(std::string mover_str) {
  if (mover_str == "Human") return std::unique_ptr<Mover>(new Human());
  if (mover_str == "Walker") return std::unique_ptr<Mover>(new Walker());
  if (mover_str == "Negamaxer") return std::unique_ptr<Mover>(new Negamaxer());
  return nullptr;
}

void PrintWinner(const Situation& sit) {
  if (sit.Winner() == 2) {
    std::cout << "Players drew by the one-move rule." << std::endl;
  } else {
    std::cout << "P" << sit.Winner() << " won!" << std::endl;
  }
  std::cout << "Final board:" << std::endl;
  PrintBoardWithEdgeIndices(sit);
}

void PlayGame(std::array<std::string, 2> mover_strs) {
  std::array<std::unique_ptr<Mover>, 2> movers{GetMover(mover_strs[0]),
                                               GetMover(mover_strs[1])};
  // Player 0 moves on even plies, player 1 moves on odd plies.
  int ply = 0;
  Situation sit;
  while (!sit.IsGameOver()) {
    PrintBoardWithEdgeIndices(sit);
    std::cout << "Move " << ply << " by P" << static_cast<int>(sit.turn) << " ("
              << mover_strs[sit.turn] << ")." << std::endl;

    auto start_time = high_resolution_clock::now();
    Move move = movers[sit.turn]->GetMove(sit);
    auto stop_time = high_resolution_clock::now();
    seconds duration_s = duration_cast<seconds>(stop_time - start_time);
    if (move == Move{0, {-1, -1}}) {
      std::cout << "Internal error" << std::endl;
      return;
    } else {
      std::cout << "Played move " << sit.MoveToString(move) << " in "
                << duration_s.count() << "s." << std::endl;
      std::cout << "Graph traversal count = "
                << benchmark_metrics.num_graph_primitives << std::endl;
    }

    sit.ApplyMove(move);
    ++ply;
  }
  PrintWinner(sit);
}

int main() {
  std::array<std::string, 2> mover_strs = {"Negamaxer", "Negamaxer"};
  while (true) {
    std::cout << "Enter a number to choose:" << std::endl;
    std::cout << "(1) Play (" << mover_strs[0] << " vs " << mover_strs[1]
              << ")." << std::endl;
    std::cout << "(2) Change P0 (current: " << mover_strs[0] << ")"
              << std::endl;
    std::cout << "(3) Change P1 (current: " << mover_strs[1] << ")"
              << std::endl;
    std::cout << "(4) Run benchmark." << std::endl;
    std::cout << "(5) Run tests." << std::endl;
    std::cout << "(6) Quit." << std::endl;
    std::cout << ">> ";
    int menu_option;
    std::cin >> menu_option;
    switch (menu_option) {
      case 1:
        PlayGame(mover_strs);
        break;
      case 2:
      case 3: {
        std::cout << "(1) Human (2) Walker (3) Negamaxer" << std::endl;
        int mover_option;
        do {
          std::cout << ">> ";
          std::cin >> mover_option;
        } while (mover_option < 1 || mover_option > 3);
        mover_strs[menu_option == 2 ? 0 : 1] = kMoverStrs[mover_option - 1];
        break;
      }
      case 4:
        RunBenchmark();
        return 0;
      case 5:
        RunTests();
        return 0;
      default:
        return 0;
    }
  }
  return 0;
}