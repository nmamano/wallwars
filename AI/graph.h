#ifndef GRAPH_H_
#define GRAPH_H_

#include <array>
#include <bitset>
#include <ostream>
#include <string>

#include "constants.h"

// A struct to represent grid graph with missing edges and related functions.

// The dimensions are compile time constants to optimize the space used to
// represent the graph (since we might want an AI to memorize millions of
// positions).
constexpr int kNumNodes = kNumRows * kNumCols;

// We serialize the nodes from coordinates to indices by row first and by column
// second.
inline int Row(int v) { return v / kNumCols; }
inline int Col(int v) { return v % kNumCols; }

inline bool IsNodeInFirstRow(int v) { return v <= kTopRightNode; }
inline bool IsNodeInLastRow(int v) { return v >= kBottomLeftNode; }
inline bool IsNodeInFirstCol(int v) { return v % kNumCols == 0; }
inline bool IsNodeInLastCol(int v) { return v % kNumCols == kNumCols - 1; }

// In a grid graph, every node except those in the last row have an edge below,
// and every node except those in the last column have an edge to the right.
// However, for simplicity, we assume that every node has one edge to the left
// and one edge to the right. there are also edges to the right of the last
// column and below the last row (we call these "fake" edges). Then, the number
// of edges (real and fake) is 2*kNumRows*kNumCols, and every node has one edge
// below and one edge to the right.
constexpr int kNumRealAndFakeEdges = 2 * kNumNodes;
constexpr int kNumFakeEdges = kNumRows + kNumCols;
constexpr int kNumRealEdges = kNumRealAndFakeEdges - kNumFakeEdges;

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
// Every edge has a lower endpoint.
inline int LowerEndpoint(int e) {
  return IsHorizontalEdge(e) ? EndpointLeft(e) : EndpointAbove(e);
}
// Real edges have a higher endpoint, but fake ones do not.
inline int HigherEndpoint(int e) {
  return IsHorizontalEdge(e) ? EndpointRight(e) : EndpointBelow(e);
}

inline bool IsFakeHorizontalEdge(int e) {
  return IsNodeInLastCol(EndpointLeft(e));
}
inline bool IsFakeVerticalEdge(int e) {
  return IsNodeInLastRow(EndpointAbove(e));
}
inline bool IsRealEdge(int e) {
  return e >= 0 && e < kNumRealAndFakeEdges &&
         (IsHorizontalEdge(e) ? !IsFakeHorizontalEdge(e)
                              : !IsFakeVerticalEdge(e));
}

// A `Graph` is a kNumRows by kNumCols grid graph where (real) edges can be
// *active* or *inactive*.
struct Graph {
  // Constructs a grid graph where all real edges are active (fake edges are
  // deactivated).
  Graph();

  // A metric to measure the efficiency of the AI in terms of graph traversals.
  // By graph traversal, we mean an operation that takes linear time on the size
  // of the graph, such as computing the distance between two nodes.
  static long long graph_traversal_count;

  // We need one bit per edge to keep track of active edges, so a `Graph` object
  // uses 2 * kNumRows * kNumCols bits (plus padding).
  std::bitset<kNumRealAndFakeEdges> edges;

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

  // Returns the nodes that are endpoints of an active edge.
  std::array<bool, kNumNodes> ActiveNodes() const;

  // Returns the distance between `s` and `t`, or -1 if they are in separate
  // connected components.
  int Distance(int s, int t) const;

  // Returns whether `s` and `t` are in the same connected component.
  inline bool CanReach(int s, int t) const { return Distance(s, t) != -1; };

  // Returns the distance between `s` and every node, or -1 if they are in
  // separate connected components.
  std::array<int, kNumNodes> Distances(int s) const;

  // Returns the indices of the nodes at distance 2 from s, or -1's if there are
  // fewer than 8.
  std::array<int, 8> NodesAtDistance2(int s) const;

  // Returns the sequence of nodes in a shortest path from `s` to `t`, both
  // included. If the path is shorter than `kNumNodes` nodes, the output array
  // contains -1's after `t`. Assumes that `t` is reachable from `s`.
  std::array<int, kNumNodes> ShortestPath(int s, int t) const;

  // Returns the sequence of nodes in a shortest path from `s` to `t`, both
  // included, respecting orientations. There is an orientation for each
  // edge. 1 means it can only be used in the direction from the smallest- to
  // the largest-indexed node (that is, left-to-right for horizontal edges and
  // top-to-bottom for vertical edges). -1 means the opposite. 0 means it can be
  // used in both directions. Assumes that `t` is reachable from `s`.
  std::array<int, kNumNodes> ShortestPathWithOrientations(
      int s, int t,
      const std::array<int, kNumRealAndFakeEdges>& orientations) const;

  // Returns a label for each node such that nodes in the same connected
  // component have the same label.
  std::array<int, kNumNodes> ConnectedComponents() const;

  // Returns the set of edges which are bridges.
  std::bitset<kNumRealAndFakeEdges> Bridges() const;

  // Returns a label for each edge such that edges in the same two-edge
  // connected components have the same label.
  std::array<int, kNumNodes> TwoEdgeConnectedComponents() const;

  // Assumes the graph is 2-edge connected. Returns two edge disjoint paths from
  // `s` to `t`. The algorithm is best-effort in trying to minimize the length
  // of the paths, particularly the first one.
  std::array<std::array<int, kNumNodes>, 2> TwoEdgeDisjointPaths(int s,
                                                                 int t) const;

  // Returns a string of the graph with `node0_char` at node `node0` and
  // `node1_char` at node `node1`. If `node0` is not a valid node (e.g., -1),
  // `node0_char` does not appear anywhere. Same with `node1_char`. `node0_char`
  // and `node1_char` are variable so that they can represent different things
  // depending in context, e.g., the positions of the players, or the source and
  // destination of a shortest path.
  std::string AsPrettyString(int node0, int node1, char node0_char,
                             char node1_char) const;

  // Prints the graph as a pretty string to the standard output.
  void PrettyPrint(int node0, int node1, char node0_char,
                   char node1_char) const;

 private:
  struct BridgesState {
    // DFS visit order, or -1 for unvisited yet.
    std::array<int, kNumNodes> rank;
    int next_rank;
    // Lowest-rank node reachable with a single back-edge in the subtree rooted
    // at each node.
    std::array<int, kNumNodes> low_link;
    std::bitset<kNumRealAndFakeEdges> bridges;
  };
  void BridgesDFS(int node, int parent, BridgesState& state) const;
};

// Converts a path to a bitset. The path is in the format returned by
// `ShortestPath`.
std::bitset<kNumRealAndFakeEdges> PathAsEdgeSet(
    std::array<int, kNumNodes> path);

inline std::ostream& operator<<(std::ostream& os, const Graph& G) {
  return os << G.AsPrettyString(-1, -1, '-', '-');
}

#endif  // GRAPH_H_
