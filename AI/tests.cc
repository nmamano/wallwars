#include "tests.h"

#include <array>
#include <functional>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

#include "external/span.h"
#include "graph.h"
#include "macros.h"
#include "negamaxer.h"
#include "situation.h"
#include "template_utils.h"

// Compares an `actual` and an `expected` value. Does nothing if they match.
// Otherwise, returns false (from the function using the macro) and prints a
// message showing the mismatch. It expects that `actual` and `expected` are of
// comparable and printable types.
#define ASSERT_EQ(actual, expected)                                       \
  do {                                                                    \
    if (actual != expected) {                                             \
      std::cerr << __LINE__ << ": Mismatch in " << __func__               \
                << "\nActual:   " << actual << "\nExpected: " << expected \
                << '\n';                                                  \
      return false;                                                       \
    }                                                                     \
  } while (0)

// Calls run_test() with the given function name as both the test function and
// the test name.
#define RUN_TEST(test) RunTest(test, #test)

namespace {

static int num_failed_tests, num_executed_tests;
void RunTest(std::function<bool()> test_f, std::string test_name) {
  std::cerr << test_name << " running..." << std::endl;
  if (!test_f()) {
    ++num_failed_tests;
    std::cerr << test_name << " FAILED" << std::endl;
  } else {
    std::cerr << test_name << " OK" << std::endl;
  }
  ++num_executed_tests;
}

// Helper functions to make tests more succinct.

// A helper function that returns a graph based on a string like:
//       ".|. . ."
//       " +-+-+ "
//       ".|. . ."
//       " + + + "
//       ". . . ."
//       " + + + "
//       ". . . ."
// The '.' and '+' must be there to represent cells and "pillars" between
// walls, respectively. The vertical / horizontal walls are activated if they
// are equal to '|' / '-', respectively, or deactivated if they are ' '. There
// are no newlines between rows.
Graph StringToGraph(const std::string& s) {
  Graph G;
  for (int i = 0; i < kNumRows * 2 - 1; ++i) {
    int row = i / 2;
    for (int j = 0; j < kNumCols * 2 - 1; ++j) {
      int s_index = i * (kNumCols * 2 - 1) + j;
      char c = s[s_index];
      int col = j / 2;
      int node = NodeAt(row, col);
      if (i % 2 == 0 && j % 2 == 0) {
        if (c != '.') {
          std::cerr << "Expected '.' while reading graph but saw '" << c << "'"
                    << std::endl;
        }
      }
      if (i % 2 == 1 && j % 2 == 1) {
        if (c != '+') {
          std::cerr << "Expected '+' while reading graph but saw '" << c << "'"
                    << std::endl;
        }
      }
      if (i % 2 == 0 && j % 2 == 1) {
        int edge = EdgeRight(node);
        if (c == '|') {
          G.DeactivateEdge(edge);
        } else if (c != ' ') {
          std::cerr << "Expected '|' or ' ' while reading graph but saw '" << c
                    << "'" << std::endl;
        }
      }
      if (i % 2 == 1 && j % 2 == 0) {
        int edge = EdgeBelow(node);
        if (c == '-') {
          G.DeactivateEdge(edge);
        } else if (c != ' ') {
          std::cerr << "Expected '-' or ' ' while reading graph but saw '" << c
                    << "'" << std::endl;
        }
      }
    }
  }
  return G;
}

// Format of `s`: "[]", "[8 (-1 -1): 20]", "[8 (-1 -1): 20, 0 (1 2): 20]"
std::vector<ScoredMove> ScoredMoveVectorAsString(const std::string& s) {
  auto sin = std::istringstream(s);
  char skip;    // Used to skip formatting characters.
  sin >> skip;  // skips '['
  std::vector<ScoredMove> res;
  ScoredMove scored_move;
  while (sin >> scored_move.move.token_change) {
    sin >> skip /*'('*/ >> scored_move.move.edges[0] >>
        scored_move.move.edges[1] >> skip /*')'*/ >> skip /*':'*/ >>
        scored_move.score >> skip /*',' or ']'*/;
    res.push_back(scored_move);
  }
  return res;
}

// Given a vector of length <= `kNumNodes`, it converts it into an array of
// length `kNumNodes`, extending it with -1's as necessary.
std::array<int, kNumNodes> ExtendWithMinus1(const std::vector<int>& v) {
  std::array<int, kNumNodes> res;
  res.fill(-1);
  if (v.size() > kNumNodes) {
    std::cerr << "Vector too long" << std::endl;
    return res;
  }
  for (size_t i = 0; i < v.size(); ++i) {
    res[i] = v[i];
  }
  return res;
}

// Tests

bool GraphDistanceTest() {
  Graph G = StringToGraph(
      ".|. . ."
      " +-+-+ "
      ".|. . ."
      " + + + "
      ". . . ."
      " + + + "
      ". . . .");
  ASSERT_EQ(G.Distance(NodeAt(0, 0), NodeAt(0, 1)), 9);
  ASSERT_EQ(G.Distance(NodeAt(0, 2), NodeAt(3, 0)), 7);
  ASSERT_EQ(G.Distance(NodeAt(3, 0), NodeAt(3, 3)), 3);
  ASSERT_EQ(G.Distance(NodeAt(0, 0), NodeAt(0, 0)), 0);
  return true;
}

bool GraphDistancesTest() {
  Graph G = StringToGraph(
      ".|. . ."
      " +-+-+ "
      ".|. . ."
      " + + + "
      ". . . ."
      " + + + "
      ". . . .");
  {
    auto actual = G.Distances(NodeAt(0, 0));
    std::array<int, kNumRows* kNumCols> expected = {0, 9, 8, 7, 1, 4, 5, 6,
                                                    2, 3, 4, 5, 3, 4, 5, 6};
    ASSERT_EQ(actual, expected);
  }
  {
    auto actual = G.Distances(NodeAt(1, 1));
    std::array<int, kNumRows* kNumCols> expected = {4, 5, 4, 3, 3, 0, 1, 2,
                                                    2, 1, 2, 3, 3, 2, 3, 4};
    ASSERT_EQ(actual, expected);
  }
  return true;
}

bool GraphNodesAtDistance2Test() {
  {
    Graph G = StringToGraph(
        ".|. . ."
        " +-+-+ "
        ".|. . ."
        " + + + "
        ". . . ."
        " + + + "
        ". . . .");
    {
      auto actual_nodes = G.NodesAtDistance2(NodeAt(0, 0));
      std::map<int, int> actual_counts;
      for (int node : actual_nodes) {
        actual_counts[node]++;
      }
      auto expected_counts = std::map<int, int>{{-1, 7}, {8, 1}};
      ASSERT_EQ(actual_counts, expected_counts);
    }
    {
      auto actual_nodes = G.NodesAtDistance2(NodeAt(2, 2));
      std::map<int, int> actual_counts;
      for (int node : actual_nodes) {
        actual_counts[node]++;
      }
      auto expected_counts =
          std::map<int, int>{{-1, 3}, {8, 1}, {5, 1}, {7, 1}, {15, 1}, {13, 1}};
      ASSERT_EQ(actual_counts, expected_counts);
    }
  }
  {
    Graph G = StringToGraph(
        ".|.|.|."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ". . . .");
    {
      auto actual_nodes = G.NodesAtDistance2(NodeAt(0, 0));
      std::map<int, int> actual_counts;
      for (int node : actual_nodes) {
        actual_counts[node]++;
      }
      auto expected_counts = std::map<int, int>{{-1, 7}, {8, 1}};
      ASSERT_EQ(actual_counts, expected_counts);
    }
    {
      auto actual_nodes = G.NodesAtDistance2(NodeAt(3, 0));
      std::map<int, int> actual_counts;
      for (int node : actual_nodes) {
        actual_counts[node]++;
      }
      auto expected_counts =
          std::map<int, int>{{-1, 6}, {NodeAt(1, 0), 1}, {NodeAt(3, 2), 1}};
      ASSERT_EQ(actual_counts, expected_counts);
    }
  }
  return true;
}

bool GraphShortestPathTest() {
  /* Node indices:
  0 1 2 3
   + + +
  4 5 6 7
   + + +
  8 9 10 11
   + + +
  12 13 14 15
  */
  {
    Graph G = StringToGraph(
        ".|. . ."
        " +-+-+ "
        ".|. . ."
        " + + + "
        ".|.|.|."
        " + +-+ "
        ". .|. .");
    auto actual = G.ShortestPath(0, 15);
    auto expected = ExtendWithMinus1({0, 4, 8, 12, 13, 9, 5, 6, 7, 11, 15});
    ASSERT_EQ(actual, expected);
  }
  // Case traversing every node.
  {
    Graph G = StringToGraph(
        ". . . ."
        "-+-+-+ "
        ". . . ."
        " +-+-+-"
        ". . . ."
        "-+-+-+ "
        ". . . .");
    auto actual = G.ShortestPath(12, 0);
    std::array<int, kNumNodes> expected = {12, 13, 14, 15, 11, 10, 9, 8,
                                           4,  5,  6,  7,  3,  2,  1, 0};
    ASSERT_EQ(actual, expected);
  }
  // Case with same start and goal.
  {
    Graph G;
    auto actual = G.ShortestPath(15, 15);
    auto expected = ExtendWithMinus1({15});
    ASSERT_EQ(actual, expected);
  }
  // Case with multiple possible shortest paths.
  {
    Graph G;
    auto actual = G.ShortestPath(3, 12);
    if (actual[0] != 3 || (actual[1] != 2 && actual[1] != 7) ||
        actual[6] != 12 || actual[7] != -1) {
      LOGF("Wrong shortest path");
      std::cerr << "Actual:   " << actual << std::endl;
      return false;
    }
  }
  return true;
}

bool GraphShortestPathWithOrientationsTest() {
  {
    Graph G;
    std::array<int, kNumRealAndFakeEdges> orientations;
    orientations.fill(0);
    for (int edge : {1, 3, 5, 11, 13, 15, 17, 19, 21}) {
      orientations[edge] = -1;
    }
    /* We have the following graph, where '^' denotes a vertical edge that can
    only be used from bottom to top:
    ". . . ."
    "^+^+^+ "
    ". . . ."
    " +^+^+^"
    ". . . ."
    "^+^+^+ "
    ". . . ." */
    {
      // Need to zigzag across to go from first to last row.
      auto actual = G.ShortestPathWithOrientations(0, 12, orientations);
      std::array<int, kNumNodes> expected = {0, 1, 2,  3,  7,  6,  5,  4,
                                             8, 9, 10, 11, 15, 14, 13, 12};
      ASSERT_EQ(actual, expected);
    }
    {
      // We can go directly from last to first row.
      auto actual = G.ShortestPathWithOrientations(12, 0, orientations);
      auto expected = ExtendWithMinus1({12, 8, 4, 0});
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Graph G;
    std::array<int, kNumRealAndFakeEdges> orientations;
    orientations.fill(0);
    for (int edge : {1, 3, 5, 11, 13, 15, 17, 19, 21}) {
      orientations[edge] = 1;
    }
    /* We have the following graph, where 'v' denotes a vertical edge that can
    only be used from top to bottom:
    ". . . ."
    "v+v+v+ "
    ". . . ."
    " +v+v+v"
    ". . . ."
    "v+v+v+ "
    ". . . ." */
    {
      // Need to zigzag across to go from last to first row.
      auto actual = G.ShortestPathWithOrientations(12, 0, orientations);
      std::array<int, kNumNodes> expected = {12, 13, 14, 15, 11, 10, 9, 8,
                                             4,  5,  6,  7,  3,  2,  1, 0};
      ASSERT_EQ(actual, expected);
    }
    {
      // We can go directly from first to last row.
      auto actual = G.ShortestPathWithOrientations(0, 12, orientations);
      auto expected = ExtendWithMinus1({0, 4, 8, 12});
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Graph G;
    std::array<int, kNumRealAndFakeEdges> orientations;
    orientations.fill(0);
    for (int edge : {0, 8, 16, 10, 18, 26, 4, 12, 20}) {
      orientations[edge] = 1;
    }
    /* We have the following graph, where '>' denotes a horizontal edge that
    can only be used from left to right:
    ".>. .>."
    " + + + "
    ".>.>.>."
    " + + + "
    ".>.>.>."
    " + + + "
    ". .>. ." */
    {
      // Need to zigzag across to go from last to first column.
      auto actual = G.ShortestPathWithOrientations(3, 0, orientations);
      std::array<int, kNumNodes> expected = {3, 7, 11, 15, 14, 10, 6, 2,
                                             1, 5, 9,  13, 12, 8,  4, 0};
      ASSERT_EQ(actual, expected);
    }
    {
      // We can go directly from first to last column.
      auto actual = G.ShortestPathWithOrientations(4, 7, orientations);
      auto expected = ExtendWithMinus1({4, 5, 6, 7});
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Graph G;
    std::array<int, kNumRealAndFakeEdges> orientations;
    orientations.fill(0);
    for (int edge : {0, 8, 16, 10, 18, 26, 4, 12, 20}) {
      orientations[edge] = -1;
    }
    /* We have the following graph, where '<' denotes a horizontal edge that
    can only be used from right to left:
    ".<. .<."
    " + + + "
    ".<.<.<."
    " + + + "
    ".<.<.<."
    " + + + "
    ". .<. ." */
    {
      // Need to zigzag across to go from first to last column.
      auto actual = G.ShortestPathWithOrientations(8, 11, orientations);
      auto expected =
          ExtendWithMinus1({8, 12, 13, 9, 5, 1, 2, 6, 10, 14, 15, 11});
      ASSERT_EQ(actual, expected);
    }
    {
      // We can go directly from last to first column.
      auto actual = G.ShortestPathWithOrientations(7, 4, orientations);
      auto expected = ExtendWithMinus1({7, 6, 5, 4});
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Graph G = StringToGraph(
        ". . . ."
        " + +-+ "
        ".|. . ."
        " + + + "
        ".|. . ."
        " + + + "
        ". .|. .");
    std::array<int, kNumRealAndFakeEdges> orientations;
    orientations.fill(0);
    for (int edge : {10, 13, 17, 18, 24}) {
      orientations[edge] = 1;
    }
    for (int edge : {3, 4, 19, 21}) {
      orientations[edge] = -1;
    }
    /* We have the following graph with disabled edges and orientations:
    ". . .<."
    " +^+-+ "
    ".|.>. ."
    " + +v+ "
    ".|.>. ."
    "v+^+^+ "
    ".>.|. ." */
    {
      auto actual = G.ShortestPathWithOrientations(0, 14, orientations);
      auto expected = ExtendWithMinus1({0, 4, 8, 12, 13, 9, 10, 11, 15, 14});
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.ShortestPathWithOrientations(15, 0, orientations);
      auto expected = ExtendWithMinus1({15, 11, 7, 3, 2, 1, 0});
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Graph G;
    std::array<int, kNumRealAndFakeEdges> orientations;
    orientations.fill(0);
    for (int edge : {0, 2, 4}) {
      orientations[edge] = -1;
    }
    /* We have the following orientations:
    ".<.<.<."
    " + + + "
    ". . . ."
    " + + + "
    ". . . ."
    " + + + "
    ". . . ." */
    {
      auto actual = G.ShortestPathWithOrientations(0, 3, orientations);
      auto expected = ExtendWithMinus1({0, 4, 5, 6, 7, 3});
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.ShortestPathWithOrientations(15, 0, orientations);
      auto expected = ExtendWithMinus1({15, 11, 7, 3, 2, 1, 0});
      ASSERT_EQ(actual, expected);
    }
  }
  return true;
}

bool GraphConnectedComponentsTest() {
  // Case with only 1 CC.
  {
    Graph G = StringToGraph(
        ".|. . ."
        " +-+-+ "
        ".|. . ."
        " + + + "
        ".|.|.|."
        " + +-+ "
        ". .|. .");
    auto actual = G.ConnectedComponents();
    std::array<int, kNumNodes> expected = {0, 0, 0, 0, 0, 0, 0, 0,
                                           0, 0, 0, 0, 0, 0, 0, 0};
    ASSERT_EQ(actual, expected);
  }
  // Case with 4 CC.
  {
    Graph G = StringToGraph(
        ".|. . ."
        " +-+-+ "
        ".|. . ."
        " +-+-+-"
        ".|.|.|."
        " + +-+ "
        ". .|. .");
    /* CCs:
    0 1 1 1
    0 1 1 1
    0 0 2 3
    0 0 3 3
    */
    auto actual = G.ConnectedComponents();
    std::array<int, kNumNodes> expected = {0, 1, 1, 1, 0, 1, 1, 1,
                                           0, 0, 2, 3, 0, 0, 3, 3};
    ASSERT_EQ(actual, expected);
  }
  return true;
}

bool GraphBridgesTest() {
  // Case where every enabled edge is a bridge.
  {
    Graph G = StringToGraph(
        ".|. . ."
        " +-+-+ "
        ".|. . ."
        " + + + "
        ".|.|.|."
        " + +-+ "
        ". .|. .");
    auto actual = G.Bridges();
    std::bitset<kNumRealAndFakeEdges> expected;
    expected.set(EdgeRight(1));
    expected.set(EdgeRight(2));
    expected.set(EdgeRight(5));
    expected.set(EdgeRight(6));
    expected.set(EdgeRight(12));
    expected.set(EdgeRight(14));
    expected.set(EdgeBelow(0));
    expected.set(EdgeBelow(3));
    expected.set(EdgeBelow(4));
    expected.set(EdgeBelow(5));
    expected.set(EdgeBelow(6));
    expected.set(EdgeBelow(7));
    expected.set(EdgeBelow(8));
    expected.set(EdgeBelow(9));
    expected.set(EdgeBelow(11));
    ASSERT_EQ(actual, expected);
  }
  // Case with no bridges.
  {
    Graph G = StringToGraph(
        ". . . ."
        " +-+-+ "
        ".|. .|."
        " + + + "
        ".|. .|."
        " +-+-+ "
        ". . . .");
    auto actual = G.Bridges();
    std::bitset<kNumRealAndFakeEdges> expected;
    ASSERT_EQ(actual, expected);
  }
  return true;
}

bool GraphTwoEdgeConnectedComponentsTest() {
  // Empty graph with only 1 2-ECC.
  {
    Graph G;
    Graph G_original = G;
    auto actual = G.TwoEdgeConnectedComponents();
    ASSERT_EQ(G, G_original);
    std::array<int, kNumNodes> expected = {0, 0, 0, 0, 0, 0, 0, 0,
                                           0, 0, 0, 0, 0, 0, 0, 0};
    ASSERT_EQ(actual, expected);
  }
  // Case with 2 2-ECC.
  {
    Graph G = StringToGraph(
        ". . . ."
        " +-+-+ "
        ".|. .|."
        " + + + "
        ".|. .|."
        " +-+-+ "
        ". . . .");
    Graph G_original = G;
    auto actual = G.TwoEdgeConnectedComponents();
    ASSERT_EQ(G, G_original);
    std::array<int, kNumNodes> expected = {0, 0, 0, 0, 0, 1, 1, 0,
                                           0, 1, 1, 0, 0, 0, 0, 0};
    ASSERT_EQ(actual, expected);
  }
  // Case with a bridge.
  {
    Graph G = StringToGraph(
        ". . . ."
        " +-+ + "
        ".|. .|."
        " + + + "
        ".|. .|."
        " +-+-+ "
        ". . . .");
    Graph G_original = G;
    auto actual = G.TwoEdgeConnectedComponents();
    ASSERT_EQ(G, G_original);
    std::array<int, kNumNodes> expected = {0, 0, 0, 0, 0, 1, 1, 0,
                                           0, 1, 1, 0, 0, 0, 0, 0};
    ASSERT_EQ(actual, expected);
  }
  // Case with single-node 2-ECCs.
  {
    Graph G = StringToGraph(
        ". . . ."
        "-+ +-+ "
        ".|. .|."
        " + + + "
        ".|. .|."
        " +-+-+ "
        ". . . .");
    Graph G_original = G;
    /* 2-ECCs:
    0 1 2 3
    4 5 5 6
    7 5 5 8
    9 10 11 12
    */
    auto actual = G.TwoEdgeConnectedComponents();
    ASSERT_EQ(G, G_original);  // Make sure graph is not modified.
    std::array<int, kNumNodes> expected = {0, 1, 2, 3, 4, 5,  5,  6,
                                           7, 5, 5, 8, 9, 10, 11, 12};
    ASSERT_EQ(actual, expected);
  }
  return true;
}

bool GraphTwoEdgeDisjointPathsTest() {
  // Empty graph case.
  {
    Graph G;
    {
      auto actual = G.TwoEdgeDisjointPaths(0, 3);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({0, 1, 2, 3}), ExtendWithMinus1({0, 4, 5, 6, 7, 3})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(15, 12);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({15, 14, 13, 12}),
          ExtendWithMinus1({15, 11, 10, 9, 8, 12})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(12, 4);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({12, 8, 4}), ExtendWithMinus1({12, 13, 9, 5, 4})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(11, 7);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({11, 7}), ExtendWithMinus1({11, 10, 6, 7})};
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Graph G = StringToGraph(
        ". . . ."
        " +-+-+ "
        ".|. .|."
        " + + + "
        ".|. .|."
        " +-+-+ "
        ". . . .");
    {
      auto actual = G.TwoEdgeDisjointPaths(0, 15);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({0, 1, 2, 3, 7, 11, 15}),
          ExtendWithMinus1({0, 4, 8, 12, 13, 14, 15})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(15, 0);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({15, 11, 7, 3, 2, 1, 0}),
          ExtendWithMinus1({15, 14, 13, 12, 8, 4, 0})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(3, 12);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({3, 7, 11, 15, 14, 13, 12}),
          ExtendWithMinus1({3, 2, 1, 0, 4, 8, 12})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(12, 3);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({12, 8, 4, 0, 1, 2, 3}),
          ExtendWithMinus1({12, 13, 14, 15, 11, 7, 3})};
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Graph G = StringToGraph(
        ". . . ."
        " +-+ + "
        ".|. .|."
        " + + + "
        ".|. .|."
        " + +-+ "
        ". . . .");
    {
      auto actual = G.TwoEdgeDisjointPaths(0, 15);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({0, 1, 2, 3, 7, 11, 15}),
          ExtendWithMinus1({0, 4, 8, 12, 13, 14, 15})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(15, 0);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({15, 11, 7, 3, 2, 1, 0}),
          ExtendWithMinus1({15, 14, 13, 12, 8, 4, 0})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(1, 5);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({1, 2, 6, 5}),
          ExtendWithMinus1({1, 0, 4, 8, 12, 13, 9, 5})};
      ASSERT_EQ(actual, expected);
    }
    {
      auto actual = G.TwoEdgeDisjointPaths(5, 1);
      std::array<std::array<int, kNumNodes>, 2> expected = {
          ExtendWithMinus1({5, 6, 2, 1}),
          ExtendWithMinus1({5, 9, 13, 12, 8, 4, 0, 1})};
      ASSERT_EQ(actual, expected);
    }
  }
  return true;
}

bool SituationIsLegalMoveTest() {
  // Case where each individual wall would be legal, but both together are not.
  Situation sit;
  sit.G = StringToGraph(
      ". . . ."
      " + + + "
      ". . . ."
      " + + + "
      ". . . ."
      " +-+-+ "
      ".|. . .");
  sit.tokens = {13, 13};
  ASSERT_EQ(sit.IsLegalMove(DoubleBuildMove(15, 20)), false);
  return true;
}

}  // namespace

bool NegamaxerOrderedMovesTest() {
  // Case where the player can do a double-token move or a single move and build
  // a wall in the edge just crossed.
  {
    Negamaxer negamaxer;
    negamaxer.sit_.G = StringToGraph(
        ".|.|.|."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ". . . .");
    {
      negamaxer.sit_.tokens = {0, 3};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[8 (-1 -1): 20, 4 (1 -1): 6]");
      ASSERT_EQ(actual, expected);
    }
    {
      negamaxer.sit_.tokens = {12, 3};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      // The move "1 (1 -1)" builds edge 1, which is the "useless edge".
      auto expected = ScoredMoveVectorAsString("[2 (-1 -1): 20, 1 (1 -1): 10]");
      ASSERT_EQ(actual, expected);
    }
    {
      // Tests case where it is player 1's turn
      negamaxer.sit_.tokens = {0, 11};
      negamaxer.sit_.turn = 1;
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      // The move "4 (7 -1)" builds edge 7, which is the "useless edge".
      auto expected = ScoredMoveVectorAsString("[3 (-1 -1): 20, 4 (7 -1): 10]");
      ASSERT_EQ(actual, expected);
    }
  }
  // Case where parts of the graph are unreachable
  {
    Negamaxer negamaxer;
    negamaxer.sit_.G = StringToGraph(
        ". . . ."
        " + + + "
        ". . . ."
        " + + + "
        ". . . ."
        "-+-+-+-"
        ". . . .");
    {
      negamaxer.sit_.tokens = {12, 15};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      // Edge 0 is the useless edge.
      auto expected = ScoredMoveVectorAsString("[2 (-1 -1): 20, 1 (0 -1): 10]");
      ASSERT_EQ(actual, expected);
    }
    {
      // Case where the player is 2 step away from the goal, so it can reach it.
      negamaxer.sit_.tokens = {13, 15};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[2 (-1 -1): 1000]");
      ASSERT_EQ(actual, expected);
    }
    {
      // Case where the player is 1 step away from the goal. It can reach it by
      // building the useless edge (0).
      negamaxer.sit_.tokens = {14, 15};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[1 (0 -1): 1000]");
      ASSERT_EQ(actual, expected);
    }
    {
      // Similar case.
      negamaxer.sit_.tokens = {14, 14};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[1 (0 -1): 1000]");
      ASSERT_EQ(actual, expected);
    }
  }
  // Case where there is no useless edge.
  {
    Negamaxer negamaxer;
    negamaxer.sit_.G = StringToGraph(
        ".|.|.|."
        "-+-+-+-"
        ".|.|.|."
        "-+-+-+-"
        ".|.|.|."
        "-+-+-+-"
        ". . . .");
    {
      negamaxer.sit_.tokens = {12, 15};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[2 (-1 -1): 20]");
      ASSERT_EQ(actual, expected);
    }
    {
      // Case where the player is 2 step away from the goal, so it can reach it.
      negamaxer.sit_.tokens = {13, 15};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[2 (-1 -1): 1000]");
      ASSERT_EQ(actual, expected);
    }
    {
      // Case where the player is 1 step away from the goal, but it cannot
      // actually move there because no edges can be built. The only legal move
      // is to walk away!
      negamaxer.sit_.tokens = {14, 15};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[-2 (-1 -1): -20]");
      ASSERT_EQ(actual, expected);
    }
    {
      // Similar case but now the opponent is not at node 15, so the edge 14->15
      // (28) becomes a useless edge when crossed by the player. Thus, the
      // player can win.
      negamaxer.sit_.tokens = {14, 14};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString("[1 (28 -1): 1000]");
      ASSERT_EQ(actual, expected);
    }
  }
  // Case where there are 2 paths to the goal
  {
    Negamaxer negamaxer;
    negamaxer.sit_.G = StringToGraph(
        ". . . ."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ". . . .");
    {
      negamaxer.sit_.tokens = {0, 3};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString(
          "[8 (-1 -1): 20, 2 (-1 -1): 20, 4 (28 -1): 15, 4 (26 -1): 15, 4 (24 "
          "-1): 15, 1 (24 -1): 15, 1 (26 -1): 15, 1 (28 -1): 15, 4 (23 -1): "
          "11, 1 (7 -1): 11, 1 (15 -1): 11, 4 (15 -1): 11, 1 (23 -1): 11, 4 (7 "
          "-1): 11, 4 (9 -1): 10, 4 (17 -1): 10, 4 (1 -1): 10, 1 (17 -1): 10, "
          "1 (9 -1): 10, 1 (1 -1): 10, 4 (4 -1): 6, 4 (0 -1): 6, 1 (4 -1): 6, "
          "1 (2 -1): 6, 1 (0 -1): 6, 4 (2 -1): 6, 0 (26 28): 4, 0 (24 28): 4, "
          "0 (24 26): 4, 0 (1 17): 1, 0 (7 15): 1, 0 (7 23): 1, 0 (9 17): 1, 0 "
          "(15 23): 1, 0 (1 9): 1, 0 (2 4): -2, 0 (0 4): -2, 0 (0 2): -2]");
      ASSERT_EQ(actual, expected);
    }
  }
  return true;
  // Case where there are many paths to the goal
  {
    Negamaxer negamaxer;
    negamaxer.sit_.G = StringToGraph(
        ".|.|.|."
        "-+-+-+ "
        ".|.|.|."
        "-+-+-+ "
        ". . . ."
        " + + + "
        ". . . .");
    {
      negamaxer.sit_.tokens = {3, 3};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString(
          "[8 (-1 -1): 20, 4 (24 -1): 15, 4 (26 -1): 15, 4 (28 -1): 15, 4 (23 "
          "-1): 11, 4 (16 -1): 10, 0 (17 24): 10, 0 (17 26): 10, 0 (18 24): "
          "10, 0 (18 26): 10, 0 (16 26): 10, 0 (16 24): 10, 4 (21 -1): 10, 4 "
          "(20 -1): 10, 4 (19 -1): 10, 4 (18 -1): 10, 4 (17 -1): 10, 0 (20 "
          "26): 7, 0 (20 24): 7, 0 (19 26): 7, 0 (19 24): 7, 0 (18 28): 7, 0 "
          "(24 26): 7, 0 (17 28): 7, 0 (16 28): 7, 0 (16 20): 4, 0 (26 28): 4, "
          "0 (24 28): 4, 0 (16 17): 4, 0 (21 28): 4, 0 (21 26): 4, 0 (21 24): "
          "4, 0 (20 28): 4, 0 (16 18): 4, 0 (16 19): 4, 0 (19 28): 4, 0 (17 "
          "23): 4, 0 (17 20): 4, 0 (17 19): 4, 0 (16 23): 4, 0 (17 18): 4, 0 "
          "(18 23): 4, 0 (18 19): 4, 0 (18 20): 4, 0 (16 21): 1, 0 (17 21): 1, "
          "0 (23 26): 1, 0 (23 24): 1, 0 (18 21): 1, 0 (20 23): 1, 0 (19 23): "
          "1, 0 (19 20): 0, 0 (21 23): -2, 0 (20 21): -3, 0 (19 21): -3]");
      ASSERT_EQ(actual, expected);
    }
    {
      negamaxer.sit_.tokens = {3, 3};
      negamaxer.sit_.turn = 1;
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString(
          "[8 (-1 -1): 20, 4 (23 -1): 11, 4 (16 -1): 10, 4 (17 -1): 10, 4 (18 "
          "-1): 10, 4 (19 -1): 10, 4 (20 -1): 10, 4 (21 -1): 10, 4 (26 -1): 6, "
          "4 (28 -1): 6, 4 (24 -1): 6, 0 (19 21): 4, 0 (20 21): 4, 0 (21 23): "
          "4, 0 (18 21): 1, 0 (19 23): 1, 0 (17 21): 1, 0 (20 23): 1, 0 (16 "
          "21): 1, 0 (23 24): 1, 0 (23 26): 1, 0 (19 20): 0, 0 (21 24): -2, 0 "
          "(21 26): -2, 0 (20 28): -2, 0 (21 28): -2, 0 (19 28): -2, 0 (24 "
          "28): -2, 0 (18 23): -2, 0 (26 28): -2, 0 (16 23): -2, 0 (17 23): "
          "-2, 0 (17 19): -3, 0 (16 17): -3, 0 (16 18): -3, 0 (16 19): -3, 0 "
          "(16 20): -3, 0 (17 18): -3, 0 (18 20): -3, 0 (17 20): -3, 0 (18 "
          "19): -3, 0 (16 28): -5, 0 (17 28): -5, 0 (18 28): -5, 0 (19 26): "
          "-6, 0 (19 24): -6, 0 (20 24): -6, 0 (20 26): -6, 0 (24 26): -6, 0 "
          "(17 24): -9, 0 (17 26): -9, 0 (16 26): -9, 0 (16 24): -9, 0 (18 "
          "26): -9, 0 (18 24): -9]");
      ASSERT_EQ(actual, expected);
    }
  }
  // Case where there are many paths to the goal
  {
    Negamaxer negamaxer;
    negamaxer.sit_.G = StringToGraph(
        ". . . ."
        " + + + "
        ". . . ."
        " + + + "
        ". . . ."
        " +-+-+ "
        ".|. . .");
    {
      negamaxer.sit_.tokens = {13, 13};
      auto actual_span = negamaxer.OrderedMoves(0);
      std::vector<ScoredMove> actual(actual_span.begin(), actual_span.end());
      auto expected = ScoredMoveVectorAsString(
          "[2 (-1 -1): 1020, 1 (20 -1): 15, 1 (18 -1): 15, 1 (16 -1): 15, 1 (0 "
          "-1): 10, 1 (15 -1): 10, 1 (13 -1): 10, 1 (12 -1): 10, 1 (11 -1): "
          "10, 1 (10 -1): 10, 1 (8 -1): 10, 1 (7 -1): 10, 1 (5 -1): 10, 1 (4 "
          "-1): 10, 1 (3 -1): 10, 1 (2 -1): 10, 1 (1 -1): 10, 1 (9 -1): 10, 0 "
          "(3 16): 4, 0 (8 16): 4, 0 (7 16): 4, 0 (10 16): 4, 0 (0 16): 4, 0 "
          "(5 16): 4, 0 (4 16): 4, 0 (9 16): 4, 0 (1 16): 4, 0 (2 16): 4, 0 "
          "(11 16): 4, 0 (12 16): 4, 0 (13 16): 4, 0 (15 16): 4, 0 (16 18): 1, "
          "0 (16 20): 1, 0 (7 9): 0, 0 (7 10): 0, 0 (4 7): 0, 0 (7 8): 0, 0 (5 "
          "15): 0, 0 (5 13): 0, 0 (5 12): 0, 0 (7 11): 0, 0 (5 11): 0, 0 (5 "
          "10): 0, 0 (5 9): 0, 0 (5 8): 0, 0 (5 7): 0, 0 (4 15): 0, 0 (4 13): "
          "0, 0 (4 12): 0, 0 (4 11): 0, 0 (4 10): 0, 0 (4 9): 0, 0 (4 8): 0, 0 "
          "(9 13): 0, 0 (13 15): 0, 0 (12 15): 0, 0 (12 13): 0, 0 (11 15): 0, "
          "0 (11 13): 0, 0 (11 12): 0, 0 (10 15): 0, 0 (10 13): 0, 0 (10 12): "
          "0, 0 (10 11): 0, 0 (9 15): 0, 0 (7 12): 0, 0 (9 12): 0, 0 (9 11): "
          "0, 0 (9 10): 0, 0 (8 15): 0, 0 (8 13): 0, 0 (8 12): 0, 0 (8 11): 0, "
          "0 (8 10): 0, 0 (8 9): 0, 0 (7 15): 0, 0 (7 13): 0, 0 (1 8): 0, 0 (2 "
          "5): 0, 0 (0 4): 0, 0 (0 5): 0, 0 (2 3): 0, 0 (1 15): 0, 0 (1 13): "
          "0, 0 (1 12): 0, 0 (1 11): 0, 0 (4 5): 0, 0 (0 7): 0, 0 (1 10): 0, 0 "
          "(1 9): 0, 0 (2 4): 0, 0 (1 7): 0, 0 (1 5): 0, 0 (1 4): 0, 0 (0 8): "
          "0, 0 (0 9): 0, 0 (1 3): 0, 0 (1 2): 0, 0 (0 15): 0, 0 (0 10): 0, 0 "
          "(0 11): 0, 0 (0 13): 0, 0 (0 12): 0, 0 (2 8): 0, 0 (0 1): 0, 0 (3 "
          "15): 0, 0 (3 13): 0, 0 (3 12): 0, 0 (3 11): 0, 0 (3 10): 0, 0 (0 "
          "2): 0, 0 (3 9): 0, 0 (3 8): 0, 0 (3 7): 0, 0 (3 5): 0, 0 (3 4): 0, "
          "0 (2 15): 0, 0 (2 13): 0, 0 (2 7): 0, 0 (2 12): 0, 0 (2 9): 0, 0 (2 "
          "10): 0, 0 (0 3): 0, 0 (2 11): 0, 0 (12 20): -3, 0 (18 20): -3, 0 (8 "
          "18): -3, 0 (11 18): -3, 0 (11 20): -3, 0 (12 18): -3, 0 (15 20): "
          "-3, 0 (13 18): -3, 0 (13 20): -3, 0 (15 18): -3, 0 (7 20): -3, 0 (3 "
          "20): -3, 0 (3 18): -3, 0 (4 18): -3, 0 (4 20): -3, 0 (2 20): -3, 0 "
          "(2 18): -3, 0 (5 18): -3, 0 (5 20): -3, 0 (7 18): -3, 0 (10 20): "
          "-3, 0 (1 20): -3, 0 (1 18): -3, 0 (8 20): -3, 0 (9 18): -3, 0 (9 "
          "20): -3, 0 (0 20): -3, 0 (0 18): -3, 0 (10 18): -3]");
      ASSERT_EQ(actual, expected);
    }
  }
  return true;
}

namespace {

bool NegamaxerGetMoveTest() {
  Negamaxer negamaxer;
  // Case with only one legal move.
  {
    Situation sit;
    sit.G = StringToGraph(
        ".|.|.|."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ".|.|.|."
        " +-+-+ "
        ". . . .");
    {
      Move actual = negamaxer.GetMove(sit);
      Move expected = DoubleWalkMove(0, 8);
      ASSERT_EQ(actual, expected);
    }
    {
      // Test other player
      sit.turn = 1;
      Move actual = negamaxer.GetMove(sit);
      Move expected = DoubleWalkMove(0, 8);
      ASSERT_EQ(actual, expected);
    }
  }
  {
    Situation sit;
    // There is only one winning move.
    sit.G = StringToGraph(
        ". . . ."
        " + + + "
        ". . . ."
        " + + + "
        ". . . ."
        " +-+-+ "
        ". . . .");
    sit.tokens = {12, 13};
    Move actual = negamaxer.GetMove(sit);
    Move expected = WalkAndBuildMove(12, 13, 24);
    ASSERT_EQ(actual, expected);
  }
  return true;
}

}  // namespace

void RunTests() {
  // The tests assume that the program is compiled with kNumRows and kNumCols
  // equal to 4, so we assert it.
  if (kNumRows != 4 || kNumCols != 4) {
    std::cerr << "Cannot run tests. Set the board dimensions to 4x4."
              << std::endl;
    return;
  }

  num_failed_tests = num_executed_tests = 0;

  // Graph tests
  RUN_TEST(GraphDistanceTest);
  RUN_TEST(GraphDistancesTest);
  RUN_TEST(GraphNodesAtDistance2Test);
  RUN_TEST(GraphShortestPathTest);
  RUN_TEST(GraphShortestPathWithOrientationsTest);
  RUN_TEST(GraphConnectedComponentsTest);
  RUN_TEST(GraphBridgesTest);
  RUN_TEST(GraphTwoEdgeConnectedComponentsTest);
  RUN_TEST(GraphTwoEdgeDisjointPathsTest);

  // Situation tests
  RUN_TEST(SituationIsLegalMoveTest);

  // Negamaxer tests
  RUN_TEST(NegamaxerOrderedMovesTest);
  RUN_TEST(NegamaxerGetMoveTest);

  std::cerr << std::endl
            << "Failed tests: " << num_failed_tests << "/" << num_executed_tests
            << std::endl;
}
