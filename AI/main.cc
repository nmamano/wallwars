#include <array>
#include <iostream>
#include <string>
#include <vector>

#include "assert.h"
#include "benchmark.h"
#include "graph.h"
#include "human.h"
#include "io.h"
#include "mover.h"
#include "negamaxer.h"
#include "situation.h"
#include "walker.h"

enum class MoverEnum { Human, Walker, Negamaxer };

std::string MoverEnumToString(MoverEnum mover_enum) {
  switch (mover_enum) {
    case MoverEnum::Human:
      return "Human";
    case MoverEnum::Walker:
      return "Walker";
    case MoverEnum::Negamaxer:
      return "Negamaxer";
    default:
      assert(0);
      return "";
  }
}

MoverEnum IntToMoverEnum(int i) {
  switch (i) {
    case 1:
      return MoverEnum::Human;
    case 2:
      return MoverEnum::Walker;
    case 3:
      return MoverEnum::Negamaxer;
    default:
      assert(0);
      return MoverEnum::Negamaxer;
  }
}

Move GetMove(const Situation& sit, MoverEnum mover) {
  switch (mover) {
    case MoverEnum::Human: {
      Human human;
      return human.GetMove(sit);
    }
    case MoverEnum::Walker: {
      Walker walker;
      return walker.GetMove(sit);
    }
    case MoverEnum::Negamaxer: {
      Negamaxer negamaxer;
      return negamaxer.GetMove(sit);
    }
    default:
      assert(0);
      return {};
  }
}

void PrintWinner(const Situation& sit) {
  std::cout << "P" << sit.Winner() << " won!" << std::endl;
  std::cout << "Final board:" << std::endl;
  PrintBoard(sit);
}

void PlayGame(std::array<MoverEnum, 2> movers) {
  Situation sit;
  // Player 0 moves on even plies, player 1 moves on odd plies.
  int ply = 0;
  while (!sit.IsGameOver()) {
    PrintBoard(sit);
    std::cout << "Move " << ply << " by P" << sit.turn << " ("
              << MoverEnumToString(movers[sit.turn]) << ")." << std::endl;
    sit.ApplyMove(GetMove(sit, movers[sit.turn]));
    ++ply;
  }
  PrintWinner(sit);
}

int main() {
  MoverEnum p0_mover = MoverEnum::Human;
  MoverEnum p1_mover = MoverEnum::Negamaxer;

  while (true) {
    std::cout << "Enter a number to choose:" << std::endl;
    std::cout << "(1) Play game (" << MoverEnumToString(p0_mover) << " vs "
              << MoverEnumToString(p1_mover) << ")." << std::endl;
    std::cout << "(2) Change P0 (current: " << MoverEnumToString(p0_mover)
              << ")" << std::endl;
    std::cout << "(3) Change P1 (current: " << MoverEnumToString(p1_mover)
              << ")" << std::endl;
    std::cout << "(4) Run benchmark." << std::endl;
    std::cout << "(5) Quit." << std::endl;
    std::cout << ">> ";
    int option;
    std::cin >> option;
    switch (option) {
      case 1:
        PlayGame({p0_mover, p1_mover});
        break;
      case 2: {
        std::cout << "(1) Human (2) Walker (3) Negamaxer" << std::endl;
        do {
          std::cout << ">> ";
          std::cin >> option;
        } while (option < 1 || option > 3);
        p0_mover = IntToMoverEnum(option);
        break;
      }
      case 3: {
        std::cout << "(1) Human (2) Walker (3) Negamaxer" << std::endl;
        do {
          std::cout << ">> ";
          std::cin >> option;
        } while (option < 1 || option > 3);
        p1_mover = IntToMoverEnum(option);
        break;
      }
      case 4:
        RunBenchmark();
        return 0;
      default:
        return 0;
    }
  }
  return 0;
}