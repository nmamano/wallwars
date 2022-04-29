#include <iostream>
#include <string>

#include "benchmark.h"
#include "interactive_game.h"
#include "tests.h"

int main(int argc, char* argv[]) {
  if (argc > 1) {
    std::string menu_option = argv[1];
    if (menu_option == "play") {
      wallwars::InteractiveGame::PlayGame();
    } else if (menu_option == "test") {
      wallwars::Tests::RunTests();
    } else if (menu_option == "benchmark") {
      std::string comparison_file = "";
      if (argc > 2) comparison_file = argv[2];
      wallwars::RunBenchmark("placeholder-for-description", comparison_file);
    } else {
      std::cout << "Unknown option: " << menu_option << std::endl;
    }
    return 0;
  }
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
        wallwars::RunBenchmark("placeholder-for-description", "");
        return 0;
      }
      default:
        return 0;
    }
  }
  return 0;
}
