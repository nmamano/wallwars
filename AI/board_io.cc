#include <array>
#include <iostream>
#include <string>

#include "graph.h"
#include "io.h"
#include "situation.h"

// todo: clean up the padding logic.
void PrintBoardWithEdgeIndices(const Situation& sit) {
  int p0 = sit.tokens[0], p1 = sit.tokens[1];
  int g0 = kGoals[0], g1 = kGoals[1];
  // First, find the maximum column width.
  std::size_t max_col_width = 2;
  for (int row = 0; row < kNumRows; ++row) {
    for (int col = 0; col < kNumCols; ++col) {
      int node = NodeAt(row, col);
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
  max_col_width =
      std::max(max_col_width, std::to_string(kNumRealAndFakeEdges).size());
  std::cout << "+" << std::string((max_col_width + 5) * kNumCols - 1, '-')
            << "+" << std::endl;
  for (int row = 0; row < kNumRows; ++row) {
    std::cout << "|  ";
    // One line for cells and horizontal edges.
    for (int col = 0; col < kNumCols; ++col) {
      int node = NodeAt(row, col);
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

      // Horizontal edge to the right. Horizontal edges always have a width of 5
      // characters.
      if (col == kNumCols - 1) continue;
      int edge = EdgeRight(node);
      if (!sit.G.edges[edge]) {
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
    std::cout << "  |" << std::endl;

    // One line for vertical edges and pillars between 4 walls.
    if (row == kNumRows - 1) continue;
    std::cout << "|";
    for (int col = 0; col < kNumCols; ++col) {
      int node = NodeAt(row, col);
      int edge = EdgeBelow(node);
      if (col == 0) {
        if (!sit.G.edges[edge])
          std::cout << "--";
        else
          std::cout << "  ";
      }
      if (!sit.G.edges[edge]) {
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
      if (col < kNumCols - 1) {
        int next_edge = EdgeBelow(NodeRight(node));
        if (!sit.G.edges[edge] && !sit.G.edges[next_edge]) {
          std::cout << "--+--";
        } else if (!sit.G.edges[edge] && sit.G.edges[next_edge]) {
          std::cout << "--+  ";

        } else if (sit.G.edges[edge] && !sit.G.edges[next_edge]) {
          std::cout << "  +--";
        } else {
          std::cout << "  +  ";
        }
      } else {
        if (!sit.G.edges[edge])
          std::cout << "--";
        else
          std::cout << "  ";
      }
    }
    std::cout << "|" << std::endl;
  }
  std::cout << "+" << std::string((max_col_width + 5) * kNumCols - 1, '-')
            << "+" << std::endl;
}