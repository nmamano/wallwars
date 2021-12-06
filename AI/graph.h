#ifndef GRAPH_H_
#define GRAPH_H_

#include <array>
#include <bitset>
#include <ostream>

// A struct to represent grid graph with missing edges and related functions.

// The dimensions are compile time constants to optimize the space used to
// represent the graph (since we might want an AI to memorize millions of
// positions).
constexpr int kNumRows = 4;
constexpr int kNumCols = 4;
constexpr int NumNodes() { return kNumRows * kNumCols; }

// We serialize the nodes from coordinates to indices by row first and by column
// second.
constexpr int NodeAtCoordinates(int row, int col) {
  return row * kNumCols + col;
}
inline int Row(int v) { return v / kNumCols; }
inline int Col(int v) { return v % kNumCols; }

constexpr int TopLeftNode() { return NodeAtCoordinates(0, 0); }
constexpr int TopRightNode() { return NodeAtCoordinates(0, kNumCols - 1); }
constexpr int BottomLeftNode() { return NodeAtCoordinates(kNumRows - 1, 0); }
constexpr int BottomRightNode() {
  return NodeAtCoordinates(kNumRows - 1, kNumCols - 1);
}

inline bool IsNodeInFirstRow(int v) { return v <= TopRightNode(); }
inline bool IsNodeInLastRow(int v) { return v >= BottomLeftNode(); }
inline bool IsNodeInFirstCol(int v) { return v % kNumCols == 0; }
inline bool IsNodeInLastCol(int v) { return v % kNumCols == kNumCols - 1; }

// In a grid graph, every node except those in the last row have an edge below,
// and every node except those in the last column have an edge to the right.
// However, for simplicity, we assume that every node has one edge to the left
// and one edge to the right. there are also edges to the right of the last
// column and below the last row (we call these "fake" edges). Then, the number
// of edges (real and fake) is 2*kNumRows*kNumCols, and every node has one edge
// below and one edge to the right.
constexpr int NumRealAndFakeEdges() { return 2 * NumNodes(); }
constexpr int NumFakeEdges() { return kNumRows + kNumCols; }
constexpr int NumRealEdges() { return NumRealAndFakeEdges() - NumFakeEdges(); }

// We give the edge to the right of node v index 2v, and the edge below node v
// has index 2v+1. This means that horizontal edges have even indices and
// vertical edges have odd indices.

inline bool IsHorizontalEdge(int e) { return e % 2 == 0; }

// Example with 3 rows and 4 columns. Nodes are in square brackets and edges in
// parentheses; fake edges are marked with #.

//   [0]--(0)--[1]--(2)--[2]--(4)--[3]--(#6)--
//    |         |         |         |
//   (1)       (3)       (5)       (7)
//    |         |         |         |
//   [4]--(8)--[5]-(10)--[6]-(12)--[7]-(#14)--
//    |         |         |         |
//   (9)      (11)      (13)      (15)
//    |         |         |         |
//   [8]-(16)--[9]-(18)-[10]-(20)-[11]-(#22)--
//    |         |         |         |
//  (#17)     (#19)    (#21)     (#23)
//    |         |         |         |

// Formula for the indices of a node v, its neighbors (in brackets) and its
// incident edges (in parentheses), where C is the number of columns:

//                   [v-C]
//                     |
//                 (2(v-C)+1)
//                     |
//   [v-1]--(2(v-1))--[v]--(2v)--[v+1]
//                     |
//                   (2v+1)
//                     |
//                   [v+C]

inline int NodeAbove(int v) { return IsNodeInFirstRow(v) ? -1 : v - kNumCols; }
inline int NodeRight(int v) { return IsNodeInLastCol(v) ? -1 : v + 1; }
inline int NodeBelow(int v) { return IsNodeInLastRow(v) ? -1 : v + kNumCols; }
inline int NodeLeft(int v) { return IsNodeInFirstCol(v) ? -1 : v - 1; }
inline int EdgeAbove(int v) {
  return IsNodeInFirstRow(v) ? -1 : 2 * NodeAbove(v) + 1;
}
inline int EdgeRight(int v) { return IsNodeInLastCol(v) ? -1 : 2 * v; }
inline int EdgeBelow(int v) { return IsNodeInLastRow(v) ? -1 : 2 * v + 1; }
inline int EdgeLeft(int v) {
  return IsNodeInFirstCol(v) ? -1 : 2 * NodeLeft(v);
}

inline int AreHorizontalNeighbors(int v1, int v2) {
  return Row(v1) == Row(v2) && (v1 == v2 - 1 || v1 == v2 + 1);
}
inline int AreVerticalNeighbors(int v1, int v2) {
  return Col(v1) == Col(v2) && (v1 == v2 - kNumCols || v1 == v2 + kNumCols);
}
inline int EdgeBetweenHorizontalNeighbors(int v1, int v2) {
  return EdgeRight(std::min(v1, v2));
}
inline int EdgeBetweenVerticalNeighbors(int v1, int v2) {
  return EdgeBelow(std::min(v1, v2));
}
inline int EdgeBetweenNeighbors(int v1, int v2) {
  return AreHorizontalNeighbors(v1, v2) ? EdgeBetweenHorizontalNeighbors(v1, v2)
                                        : EdgeBetweenVerticalNeighbors(v1, v2);
}

// Formula for the indices of the endpoints of a horizontal edge e (e is even):

//             [e/2]--(e)--[e/2+1]

// Formula for the indices of the endpoints of a vertical edge e (e is odd):

//                 [(e-1)/2]
//                     |
//                    (e)
//                     |
//                [(e-1)/2+C]

inline int EndpointLeft(int e) { return e / 2; }
inline int EndpointRight(int e) { return e / 2 + 1; }
inline int EndpointAbove(int e) { return (e - 1) / 2; }
inline int EndpointBelow(int e) { return (e - 1) / 2 + kNumCols; }

inline bool IsFakeHorizontalEdge(int e) {
  return IsNodeInLastCol(EndpointLeft(e));
}
inline bool IsFakeVerticalEdge(int e) {
  return IsNodeInLastRow(EndpointAbove(e));
}
inline bool IsRealEdge(int e) {
  return e >= 0 && e < NumRealAndFakeEdges() &&
         (IsHorizontalEdge(e) ? !IsFakeHorizontalEdge(e)
                              : !IsFakeVerticalEdge(e));
}

// A `Graph` is a kNumRows by kNumCols grid graph where (real) edges can be
// *active* or *inactive*.
struct Graph {
  // Constructs a grid graph where all real edges are active (fake edges are
  // deactivated).
  Graph();

  // We need one bit per edge to keep track of active edges, so a `Graph` object
  // uses 2 * kNumRows * kNumCols bits (plus padding).
  std::bitset<NumRealAndFakeEdges()> edges;

  bool operator==(const Graph& rhs) const { return (edges == rhs.edges); }
  bool operator!=(const Graph& rhs) const { return !operator==(rhs); }

  inline int NumActiveEdges() const { return edges.count(); }
  inline void ActivateEdge(int edge) { edges.set(edge); }
  inline void DeactivateEdge(int edge) { edges.set(edge, false); }

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
  // at the border of the grid or because the edge is inactive), the
  // corresponding value is -1.
  inline std::array<int, 4> GetNeighbors(int v) const {
    return {NeighborAbove(v), NeighborRight(v), NeighborBelow(v),
            NeighborLeft(v)};
  }

  // `dir` can be 0 for up, 1 for right, 2 for down, or 3 for left.
  int NeighborInDirection(int v, int dir) const;

  // Returns the distance between `s` and `t`, or -1 if they are in separate
  // connected components.
  int Distance(int s, int t) const;

  // Returns the distance between `s` and every node, or -1 if they are in
  // separate connected components.
  std::array<int, NumNodes()> Distances(int s) const;
};

inline std::ostream& operator<<(std::ostream& os, const Graph& G) {
  return os << G.edges;
}

#endif  // GRAPH_H_