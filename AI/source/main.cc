#include <iostream>

#include "benchmark.h"
#include "interactive_game.h"
#include "tests.h"

int main() {
  while (true) {
    std::cout << "Enter a number to choose:" << std::endl
              << "(1) Play." << std::endl
              << "(2) Run tests." << std::endl
              << "(3) Run tests, benchmark, and quit." << std::endl
              << "(4) Quit." << std::endl
              << ">> ";
    char menu_option;
    std::cin >> menu_option;
    switch (menu_option) {
      case '1':
        wallwars::InteractiveGame::PlayGame();
        break;
      case '2':
        wallwars::Tests::RunTests();
        break;
      case '3': {
        if (!wallwars::Tests::RunTests()) {
          std::cout << "Benchmark did not start due to failing tests."
                    << std::endl;
        }
        wallwars::RunBenchmark();
        return 0;
      }
      default:
        return 0;
    }
  }
  return 0;
}
