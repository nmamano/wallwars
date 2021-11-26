#ifndef GRAPH_H
#define GRAPH_H

#include <array>
#include <bitset>
#include <iostream>
#include <vector>

/* A grid graph.

The graph has num_rows*(num_cols-1) horizontal edges and
(num_rows-1)*num_cols vertical edges. However, for simplicity, we assume
that there are also edges to the right of the last column and below the
last row. Then, the number of edges is 2*num_rows*num_cols, and every cell
has one wall below and one wall to the right. The edge to the right of cell
i has index 2*i, and the edge below cell i has index 2*i+1.
This means that horizontal edges have even indices and vertical edges have
odd indices.

Visualization of the indices of a node i, its neighbors (in brackets) and its
incident edges (in parentheses), where C is the number of columns:

                  [i-C]
                    |
                (2(i-C)+1)
                    |
  [i-1]--(2(i-1))--[i]--(2i)--[i+1]
                    |
                  (2i+1)
                    |
                  [i+C]

Visualization of a horizontal edge e (e is even) and its endpoints:

            [e/2]--(e)--[e/2+1]

Visualization of a vertical edge e (e is odd) and its endpoints:

                [(e-1)/2]
                    |
                   (e)
                    |
               [(e-1)/2+C]

Visualization of node and edge indices (square brackets are cells and
brackets are "fake" walls) with 3 rows and 4 columns:

  [0]  0  [1]  2  [2]  4  [3] {6}

   1       3       5       7

  [4]  8  [5] 10  [6] 12  [7] {14}

   9      11      13      15

  [8] 16  [9] 18 [10] 20 [11] {22}

 {17}    {19}    {21}    {23}
*/

constexpr int MAX_ROWS = 10;
constexpr int MAX_COLS = 12;
constexpr int MaxNumEdges() { return 2 * MAX_ROWS * MAX_COLS; }

struct Graph {
  // Constructs a grid graph with no missing edges.
  Graph(int num_rows_, int num_cols_)
      : num_rows(num_rows_), num_cols(num_cols_) {
    edges.set();
  }
  int num_rows, num_cols;
  std::bitset<MaxNumEdges()> edges;

  inline int NumNodes() const { return num_rows * num_cols; }
  inline int NodeAtCoordinates(int row, int col) const {
    return row * num_cols + col;
  }
  inline int TopLeftNode() const { return NodeAtCoordinates(0, 0); }
  inline int TopRightNode() const { return NodeAtCoordinates(0, num_cols - 1); }
  inline int BottomLeftNode() const {
    return NodeAtCoordinates(num_rows - 1, 0);
  }
  inline int BottomRightNode() const {
    return NodeAtCoordinates(num_rows - 1, num_cols - 1);
  }
  inline bool IsNodeInFirstRow(int v) const { return v <= TopRightNode(); }
  inline bool IsNodeInLastRow(int v) const { return v >= BottomLeftNode(); }
  inline bool IsNodeInFirstCol(int v) const { return v % num_cols == 0; }
  inline bool IsNodeInLastCol(int v) const {
    return v % num_cols == num_cols - 1;
  }
  inline int NodeAbove(int v) const {
    return IsNodeInFirstRow(v) ? -1 : v - num_cols;
  }
  inline int NodeRight(int v) const { return IsNodeInLastCol(v) ? -1 : v + 1; }
  inline int NodeBelow(int v) const {
    return IsNodeInLastRow(v) ? -1 : v + num_cols;
  }
  inline int NodeLeft(int v) const { return IsNodeInFirstCol(v) ? -1 : v - 1; }
  inline int EdgeAbove(int v) const {
    return IsNodeInFirstRow(v) ? -1 : 2 * NodeAbove(v) + 1;
  }
  inline int EdgeRight(int v) const { return IsNodeInLastCol(v) ? -1 : 2 * v; }
  inline int EdgeBelow(int v) const {
    return IsNodeInLastRow(v) ? -1 : 2 * v + 1;
  }
  inline int EdgeLeft(int v) const {
    return IsNodeInFirstCol(v) ? -1 : 2 * NodeLeft(v);
  }
  inline int EdgeBetween(int v1, int v2) const {
    if (NodeAbove(v1) == v2) return EdgeAbove(v1);
    if (NodeRight(v1) == v2) return EdgeRight(v1);
    if (NodeBelow(v1) == v2) return EdgeBelow(v1);
    if (NodeLeft(v1) == v2) return EdgeLeft(v1);
    return -1;
  }
  inline int NeighborAbove(int v) const {
    return (IsNodeInFirstRow(v) || !edges[EdgeAbove(v)]) ? -1 : NodeAbove(v);
  }
  inline int NeighborRight(int v) const {
    return (IsNodeInLastCol(v) || !edges[EdgeRight(v)]) ? -1 : NodeRight(v);
  }
  inline int NeighborBelow(int v) const {
    return (IsNodeInLastRow(v) || !edges[EdgeBelow(v)]) ? -1 : NodeBelow(v);
  }
  inline int NeighborLeft(int v) const {
    return (IsNodeInFirstCol(v) || !edges[EdgeLeft(v)]) ? -1 : NodeLeft(v);
  }

  // Returns the neighbors of `v`, in order: up, right, down, left. If a
  // neighbor cannot be reached in one of the direction (either because the v is
  // at the border of the grid or because there is no edge), the corresponding
  // value is -1.
  inline std::array<int, 4> GetNeighbors(int v) const {
    return {NeighborAbove(v), NeighborRight(v), NeighborBelow(v),
            NeighborLeft(v)};
  }
  // `dir` can be 0 for up, 1 for right, 2 for down, or 3 for left.
  inline int NeighborInDirection(int v, int dir) const {
    switch (dir) {
      case 0:
        return NeighborAbove(v);
      case 1:
        return NeighborRight(v);
      case 2:
        return NeighborBelow(v);
      case 3:
        return NeighborLeft(v);
      default:
        return -1;
    }
  }

  inline bool isHorizontalEdge(int e) const { return e % 2 == 0; }
  inline int EndpointLeft(int e) const { return e / 2; }
  inline int EndpointRight(int e) const { return e / 2 + 1; }
  inline int EndpointAbove(int e) const { return (e - 1) / 2; }
  inline int EndpointBelow(int e) const { return (e - 1) / 2 + num_cols; }
  inline bool isFakeHorizontalEdge(int e) const {
    return IsNodeInLastCol(EndpointLeft(e));
  }
  inline bool isFakeVerticalEdge(int e) const {
    return IsNodeInLastRow(EndpointAbove(e));
  }
  inline int NumRealAndFakeEdges() const { return 2 * NumNodes(); }
  inline bool IsRealEdge(int e) const {
    return e >= 0 && e < NumRealAndFakeEdges() &&
           (isHorizontalEdge(e) ? !isFakeHorizontalEdge(e)
                                : !isFakeVerticalEdge(e));
  }
  inline void RemoveEdge(int edge) { edges.set(edge, false); }
  inline void AddEdge(int edge) { edges.set(edge); }

  // Returns the distance between `s` and `t`, or -1 if they are in separate
  // connected components. Based on BFS.
  int Distance(int s, int t) const;

  // Returns the distance between `s` and every node, or -1 if they are in
  // separate connected components. Based on BFS.
  std::vector<int> Distances(int s) const;
};

#endif  // GRAPH_H