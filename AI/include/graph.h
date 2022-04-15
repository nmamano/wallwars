#ifndef GRAPH_H_
#define GRAPH_H_

#include <array>
#include <bitset>
#include <cassert>
#include <iostream>
#include <ostream>
#include <string>

#include "benchmark_metrics.h"
#include "macro_utils.h"
#include "utils.h"

namespace wallwars {

// R (rows) and C (columns) represent the board dimensions.
constexpr int NumNodes(int R, int C) { return R * C; }
constexpr int NodeAt(int C, int row, int col) { return row * C + col; }
constexpr int TopLeftNode() { return 0; }
constexpr int TopRightNode(int C) { return NodeAt(C, 0, C - 1); }
constexpr int BottomLeftNode(int R, int C) { return NodeAt(C, R - 1, 0); }
constexpr int BottomRightNode(int R, int C) { return NodeAt(C, R - 1, C - 1); }

// We serialize the nodes from coordinates to indices by row first and by
// column second.
constexpr int Row(int C, int v) { return v / C; }
constexpr int Col(int C, int v) { return v % C; }

constexpr bool IsNodeInFirstRow(int C, int v) { return v <= TopRightNode(C); }
constexpr bool IsNodeInLastRow(int R, int C, int v) {
  return v >= BottomLeftNode(R, C);
}
constexpr bool IsNodeInFirstCol(int C, int v) { return v % C == 0; }
constexpr bool IsNodeInLastCol(int C, int v) { return v % C == C - 1; }

// In a grid graph, every node except those in the last row have an edge
// below, and every node except those in the last column have an edge to the
// right. However, for simplicity, we assume that every node has one edge to
// the left and one edge to the right. there are also edges to the right of
// the last column and below the last row (we call these "fake" edges). Then,
// the number of edges (real and fake) is 2*R*C, and every node
// has one edge below and one edge to the right.
constexpr int NumRealAndFakeEdges(int R, int C) { return 2 * NumNodes(R, C); }
constexpr int NumFakeEdges(int R, int C) { return R + C; }
constexpr int NumRealEdges(int R, int C) {
  return NumRealAndFakeEdges(R, C) - NumFakeEdges(R, C);
}

// We give the edge to the right of node v index 2v, and the edge below node v
// has index 2v+1. This means that horizontal edges have even indices and
// vertical edges have odd indices.

constexpr bool IsHorizontalEdge(int e) { return e % 2 == 0; }

// Example with 3 rows and 4 columns. Nodes are in square brackets and edges
// in parentheses; fake edges are marked with #.

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

constexpr int NodeAbove(int C, int v) {
  return IsNodeInFirstRow(C, v) ? -1 : v - C;
}
constexpr int NodeRight(int C, int v) {
  return IsNodeInLastCol(C, v) ? -1 : v + 1;
}
constexpr int NodeBelow(int R, int C, int v) {
  return IsNodeInLastRow(R, C, v) ? -1 : v + C;
}
constexpr int NodeLeft(int C, int v) {
  return IsNodeInFirstCol(C, v) ? -1 : v - 1;
}
constexpr int EdgeAbove(int C, int v) {
  return IsNodeInFirstRow(C, v) ? -1 : 2 * NodeAbove(C, v) + 1;
}
constexpr int EdgeRight(int C, int v) {
  return IsNodeInLastCol(C, v) ? -1 : 2 * v;
}
constexpr int EdgeBelow(int R, int C, int v) {
  return IsNodeInLastRow(R, C, v) ? -1 : 2 * v + 1;
}
constexpr int EdgeLeft(int C, int v) {
  return IsNodeInFirstCol(C, v) ? -1 : 2 * NodeLeft(C, v);
}

constexpr int AreHorizontalNeighbors(int C, int v1, int v2) {
  return Row(C, v1) == Row(C, v2) && (v1 == v2 - 1 || v1 == v2 + 1);
}
constexpr int AreVerticalNeighbors(int C, int v1, int v2) {
  return Col(C, v1) == Col(C, v2) && (v1 == v2 - C || v1 == v2 + C);
}
constexpr int EdgeBetweenHorizontalNeighbors(int C, int v1, int v2) {
  return EdgeRight(C, v1 < v2 ? v1 : v2);
}
constexpr int EdgeBetweenVerticalNeighbors(int R, int C, int v1, int v2) {
  return EdgeBelow(R, C, v1 < v2 ? v1 : v2);
}
constexpr int EdgeBetweenNeighbors(int R, int C, int v1, int v2) {
  return AreHorizontalNeighbors(C, v1, v2)
             ? EdgeBetweenHorizontalNeighbors(C, v1, v2)
             : EdgeBetweenVerticalNeighbors(R, C, v1, v2);
}

// Formula for the indices of the endpoints of a horizontal edge e (e is
// even):

//             [e/2]--(e)--[e/2+1]

// Formula for the indices of the endpoints of a vertical edge e (e is odd):

//                 [(e-1)/2]
//                     |
//                    (e)
//                     |
//                [(e-1)/2+C]

constexpr int EndpointLeft(int e) { return e / 2; }
constexpr int EndpointRight(int e) { return e / 2 + 1; }
constexpr int EndpointAbove(int e) { return (e - 1) / 2; }
constexpr int EndpointBelow(int C, int e) { return (e - 1) / 2 + C; }
// Every edge has a lower endpoint.
constexpr int LowerEndpoint(int e) {
  return IsHorizontalEdge(e) ? EndpointLeft(e) : EndpointAbove(e);
}
// Real edges have a higher endpoint, but fake ones do not.
constexpr int HigherEndpoint(int C, int e) {
  return IsHorizontalEdge(e) ? EndpointRight(e) : EndpointBelow(C, e);
}

constexpr bool IsFakeHorizontalEdge(int C, int e) {
  return IsNodeInLastCol(C, EndpointLeft(e));
}
constexpr bool IsFakeVerticalEdge(int R, int C, int e) {
  return IsNodeInLastRow(R, C, EndpointAbove(e));
}
constexpr bool IsRealEdge(int R, int C, int e) {
  return e >= 0 && e < NumRealAndFakeEdges(R, C) &&
         (IsHorizontalEdge(e) ? !IsFakeHorizontalEdge(C, e)
                              : !IsFakeVerticalEdge(R, C, e));
}

template <int R, int C>
std::bitset<NumRealAndFakeEdges(R, C)> PathAsEdgeSet(
    std::array<int, NumNodes(R, C)> path) {
  std::bitset<NumRealAndFakeEdges(R, C)> edge_set;
  for (int i = 0; i < NumNodes(R, C) - 1 && path[i + 1] != -1; ++i) {
    edge_set.set(EdgeBetweenNeighbors(R, C, path[i], path[i + 1]));
  }
  return edge_set;
}

// A `Graph` is a R by C grid graph where (real) edges can be
// *active* or *inactive*.
// The dimensions are compile time constants to optimize the space used to
// represent the graph (since we might want an AI to memorize millions of
// positions).
template <int R, int C>
struct Graph {
  // We need one bit per edge to keep track of active edges, so a `Graph` object
  // uses 2 * R * C bits (plus padding).
  std::bitset<NumRealAndFakeEdges(R, C)> edges;

  // Constructs a grid graph where all real edges are active (fake edges are
  // deactivated).
  Graph() { Reset(); }

  void Reset() {
    edges.set();
    for (int e = 0; e < NumRealAndFakeEdges(R, C); e++) {
      if (!IsRealEdge(R, C, e)) DeactivateEdge(e);
    }
  }

  // Initializes `this` based on a string `s` like:
  //       ".|. . ."
  //       " +-+-+ "
  //       ".|. . ."
  //       " + + + "
  //       ". . . ."
  //       " + + + "
  //       ". . . ."
  // The '.' and '+' must be there to represent cells and "pillars" between
  // walls, respectively. The vertical and horizontal walls are activated if
  // they are '|' and '-', respectively, and deactivated if they are ' '. There
  // are no newlines between rows. Returns whether `s` is parsed correctly, in
  // which case `this` is set to the resulting graph.
  bool BuildFromString(const std::string& s) {
    Reset();
    for (int i = 0; i < R * 2 - 1; ++i) {
      int row = i / 2;
      for (int j = 0; j < C * 2 - 1; ++j) {
        int s_index = i * (C * 2 - 1) + j;
        char c = s[s_index];
        int col = j / 2;
        int node = NodeAt(C, row, col);
        if (i % 2 == 0 && j % 2 == 0) {
          if (c != '.') {
            std::cout << "Expected '.' while reading graph but saw '" << c
                      << "'" << std::endl;
            Reset();
            return false;
          }
        }
        if (i % 2 == 1 && j % 2 == 1) {
          if (c != '+') {
            std::cout << "Expected '+' while reading graph but saw '" << c
                      << "'" << std::endl;
            Reset();
            return false;
          }
        }
        if (i % 2 == 0 && j % 2 == 1) {
          int edge = EdgeRight(C, node);
          if (c == '|') {
            DeactivateEdge(edge);
          } else if (c != ' ') {
            std::cout << "Expected '|' or ' ' while reading graph but saw '"
                      << c << "'" << std::endl;
            Reset();
            return false;
          }
        }
        if (i % 2 == 1 && j % 2 == 0) {
          int edge = EdgeBelow(R, C, node);
          if (c == '-') {
            DeactivateEdge(edge);
          } else if (c != ' ') {
            std::cout << "Expected '-' or ' ' while reading graph but saw '"
                      << c << "'" << std::endl;
            Reset();
            return false;
          }
        }
      }
    }
    return true;
  }

  bool operator==(const Graph& rhs) const { return (edges == rhs.edges); }
  bool operator!=(const Graph& rhs) const { return !operator==(rhs); }

  inline int NumActiveEdges() const { return edges.count(); }
  inline void ActivateEdge(int edge) { edges.set(edge); }
  inline void DeactivateEdge(int edge) { edges.set(edge, false); }

  inline int NeighborAbove(int v) const {
    return (IsNodeInFirstRow(C, v) || !edges[EdgeAbove(C, v)])
               ? -1
               : NodeAbove(C, v);
  }
  inline int NeighborRight(int v) const {
    return (IsNodeInLastCol(C, v) || !edges[EdgeRight(C, v)]) ? -1
                                                              : NodeRight(C, v);
  }
  inline int NeighborBelow(int v) const {
    return (IsNodeInLastRow(R, C, v) || !edges[EdgeBelow(R, C, v)])
               ? -1
               : NodeBelow(R, C, v);
  }
  inline int NeighborLeft(int v) const {
    return (IsNodeInFirstCol(C, v) || !edges[EdgeLeft(C, v)]) ? -1
                                                              : NodeLeft(C, v);
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
  int NeighborInDirection(int v, int dir) const {
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

  // Returns the nodes that are endpoints of an active edge.
  std::array<bool, NumNodes(R, C)> ActiveNodes() const {
    METRIC_INC(num_graph_primitives);
    std::array<bool, NumNodes(R, C)> active_nodes;
    active_nodes.fill(false);
    for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
      if (edges[edge]) {
        active_nodes[LowerEndpoint(edge)] = true;
        active_nodes[HigherEndpoint(C, edge)] = true;
      }
    }
    return active_nodes;
  }

  // Returns the distance between `s` and `t`, or -1 if they are in separate
  // connected components.
  int Distance(int s, int t) const {
    METRIC_INC(num_graph_primitives);
    thread_local std::array<int, NumNodes(R, C)> BFS_queue;
    thread_local std::array<int, NumNodes(R, C)> dist;
    if (s == t) return 0;
    dist.fill(-1);
    dist[s] = 0;
    BFS_queue[0] = s;
    int write_index = 1;
    int read_index = 0;
    while (read_index < write_index) {
      int node = BFS_queue[read_index++];
      for (int nbr : GetNeighbors(node)) {
        if (nbr != -1 && dist[nbr] == -1) {
          if (nbr == t) return dist[node] + 1;
          dist[nbr] = dist[node] + 1;
          BFS_queue[write_index++] = nbr;
        }
      }
    }
    return -1;
  }

  // Returns whether `s` and `t` are in the same connected component.
  inline bool CanReach(int s, int t) const { return Distance(s, t) != -1; };

  // Returns the distance between `s` and every node, or -1 if they are in
  // separate connected components.
  std::array<int, NumNodes(R, C)> Distances(int s) const {
    METRIC_INC(num_graph_primitives);
    thread_local std::array<int, NumNodes(R, C)> BFS_queue;
    std::array<int, NumNodes(R, C)> dist;
    dist.fill(-1);
    dist[s] = 0;
    BFS_queue[0] = s;
    int write_index = 1;
    int read_index = 0;
    while (read_index < write_index) {
      int node = BFS_queue[read_index++];
      for (int nbr : GetNeighbors(node)) {
        if (nbr != -1 && dist[nbr] == -1) {
          dist[nbr] = dist[node] + 1;
          BFS_queue[write_index++] = nbr;
        }
      }
    }
    return dist;
  }

  // Returns the indices of the nodes at distance 2 from s, or -1's if there are
  // fewer than 8.
  std::array<int, 8> NodesAtDistance2(int s) const {
    thread_local std::array<int, NumNodes(R, C)> BFS_queue;
    thread_local std::array<int, NumNodes(R, C)> dist;
    std::array<int, 8> nodes_at_distance_2;
    nodes_at_distance_2.fill(-1);
    int nodes_at_distance_2_index = 0;
    dist.fill(-1);
    dist[s] = 0;
    BFS_queue[0] = s;
    int write_index = 1;
    int read_index = 0;
    while (read_index < write_index) {
      int node = BFS_queue[read_index++];
      if (dist[node] == 2) {
        nodes_at_distance_2[nodes_at_distance_2_index++] = node;
      } else {
        for (int nbr : GetNeighbors(node)) {
          if (nbr != -1 && dist[nbr] == -1) {
            dist[nbr] = dist[node] + 1;
            BFS_queue[write_index++] = nbr;
          }
        }
      }
    }
    return nodes_at_distance_2;
  }

  // Returns the sequence of nodes in a shortest path from `s` to `t`, both
  // included. If the path is shorter than `kNumNodes` nodes, the output array
  // contains -1's after `t`. Assumes that `t` is reachable from `s`.
  std::array<int, NumNodes(R, C)> ShortestPath(int s, int t) const {
    METRIC_INC(num_graph_primitives);
    thread_local std::array<int, NumNodes(R, C)> BFS_queue;
    thread_local std::array<int, NumNodes(R, C)> dist;
    thread_local std::array<int, NumNodes(R, C)> predecessor;
    std::array<int, NumNodes(R, C)> shortest_path;
    shortest_path.fill(-1);
    shortest_path[0] = s;
    if (s == t) return shortest_path;

    BFS_queue[0] = s;
    int write_index = 1;
    int read_index = 0;
    dist.fill(-1);
    dist[s] = 0;
    predecessor[s] = s;
    while (read_index < write_index) {
      int node = BFS_queue[read_index++];
      for (int nbr : GetNeighbors(node)) {
        if (nbr != -1 && dist[nbr] == -1) {
          dist[nbr] = dist[node] + 1;
          predecessor[nbr] = node;
          if (nbr == t) {
            // Path reconstruction.
            int path_index = dist[t];
            int cur_node = t;
            while (path_index > 0) {
              shortest_path[path_index--] = cur_node;
              cur_node = predecessor[cur_node];
            }
            return shortest_path;
          }
          BFS_queue[write_index++] = nbr;
        }
      }
    }
    DBGV(AsPrettyString(s, t, 's', 't'));
    assert(false && "There is no shortest path");
    return {};
  }

  // Returns the sequence of nodes in a shortest path from `s` to `t`, both
  // included, respecting orientations. There is an orientation for each
  // edge. 1 means it can only be used in the direction from the smallest- to
  // the largest-indexed node (that is, left-to-right for horizontal edges and
  // top-to-bottom for vertical edges). -1 means the opposite. 0 means it can be
  // used in both directions. Assumes that `t` is reachable from `s`.
  std::array<int, NumNodes(R, C)> ShortestPathWithOrientations(
      int s, int t,
      const std::array<int, NumRealAndFakeEdges(R, C)>& orientations) const {
    METRIC_INC(num_graph_primitives);
    thread_local std::array<int, NumNodes(R, C)> BFS_queue;
    thread_local std::array<int, NumNodes(R, C)> dist;
    thread_local std::array<int, NumNodes(R, C)> predecessor;
    std::array<int, NumNodes(R, C)> shortest_path;
    shortest_path.fill(-1);
    shortest_path[0] = s;
    if (s == t) return shortest_path;

    BFS_queue[0] = s;
    int write_index = 1;
    int read_index = 0;
    dist.fill(-1);
    dist[s] = 0;
    predecessor[s] = s;
    while (read_index < write_index) {
      int node = BFS_queue[read_index++];
      for (int nbr : GetNeighbors(node)) {
        if (nbr == -1 || dist[nbr] != -1) continue;
        int edge = EdgeBetweenNeighbors(R, C, node, nbr);
        if (nbr > node && orientations[edge] == -1) continue;
        if (nbr < node && orientations[edge] == 1) continue;
        dist[nbr] = dist[node] + 1;
        predecessor[nbr] = node;
        if (nbr == t) {
          // Path reconstruction.
          int path_index = dist[t];
          int cur_node = t;
          while (path_index > 0) {
            shortest_path[path_index--] = cur_node;
            cur_node = predecessor[cur_node];
          }
          return shortest_path;
        }
        BFS_queue[write_index++] = nbr;
      }
    }
    DBGE(PrettyPrint(s, t, 's', 't'));
    assert(false && "There is no shortest path with orientations");
    return {};
  }

  // Returns a label for each node such that nodes in the same connected
  // component have the same label.
  std::array<int, NumNodes(R, C)> ConnectedComponents() const {
    METRIC_INC(num_graph_primitives);
    thread_local std::array<int, NumNodes(R, C)> BFS_queue;
    std::array<int, NumNodes(R, C)> connected_components;
    connected_components.fill(-1);
    int cur_label = 0;
    for (int start_node = 0; start_node < NumNodes(R, C); ++start_node) {
      if (connected_components[start_node] != -1) continue;
      connected_components[start_node] = cur_label;
      BFS_queue[0] = start_node;
      int write_index = 1;
      int read_index = 0;
      while (read_index < write_index) {
        int node = BFS_queue[read_index++];
        for (int nbr : GetNeighbors(node)) {
          if (nbr != -1 && connected_components[nbr] == -1) {
            connected_components[nbr] = cur_label;
            BFS_queue[write_index++] = nbr;
          }
        }
      }
      ++cur_label;
    }
    return connected_components;
  }

  // Returns the set of edges which are bridges.
  std::bitset<NumRealAndFakeEdges(R, C)> Bridges() const {
    METRIC_INC(num_graph_primitives);
    static BridgesState state;
    state.rank.fill(-1);
    state.next_rank = 0;
    state.low_link.fill(-1);
    state.bridges.reset();
    for (int node = 0; node < NumNodes(R, C); ++node) {
      if (state.rank[node] == -1) {
        BridgesDFS(node, -1, state);
      }
    }
    return std::bitset<NumRealAndFakeEdges(R, C)>{state.bridges};
  }

  // Returns a label for each edge such that edges in the same two-edge
  // connected components have the same label.
  std::array<int, NumNodes(R, C)> TwoEdgeConnectedComponents() const {
    const std::bitset<NumRealAndFakeEdges(R, C)> bridges = Bridges();
    Graph copy = *this;
    for (int edge = 0; edge < NumRealAndFakeEdges(R, C); ++edge) {
      if (bridges[edge]) copy.DeactivateEdge(edge);
    }
    return copy.ConnectedComponents();
  }

  // Assumes the graph is 2-edge connected. Returns two edge disjoint paths from
  // `s` to `t`. The algorithm is best-effort in trying to minimize the length
  // of the paths, particularly the first one.
  std::array<std::array<int, NumNodes(R, C)>, 2> TwoEdgeDisjointPaths(
      int s, int t) const {
    const std::array<int, NumNodes(R, C)> augmenting_path1 = ShortestPath(s, t);
    // Edges in `augmenting_path1` can only be used in the opposite orientation
    // when finding `augmenting_path2`.
    std::array<int, NumRealAndFakeEdges(R, C)> orientations;
    orientations.fill(0);
    for (int i = 0; i < NumNodes(R, C) - 1 && augmenting_path1[i + 1] != -1;
         ++i) {
      orientations[EdgeBetweenNeighbors(R, C, augmenting_path1[i],
                                        augmenting_path1[i + 1])] =
          augmenting_path1[i] < augmenting_path1[i + 1] ? -1 : 1;
    }
    const std::array<int, NumNodes(R, C)> augmenting_path2 =
        ShortestPathWithOrientations(s, t, orientations);

    // Now we have found two paths from `s` to `t`, which might overlap in some
    // edges, but only in opposite directions. By taking the xor of the edges in
    // the two paths, the edges that are traversed in both directions cancel out
    // and we are left with a set of edges that make up two disjoint paths
    // without any overlapping edges.
    Graph subgraph;
    subgraph.edges = PathAsEdgeSet<R, C>(augmenting_path1) ^
                     PathAsEdgeSet<R, C>(augmenting_path2);

    const std::array<int, NumNodes(R, C)> path1 = subgraph.ShortestPath(s, t);
    // Remove the edges in `path1` (using the formula A\B = A&(A^B) for sets).
    subgraph.edges &= subgraph.edges ^ PathAsEdgeSet<R, C>(path1);
    return {path1, subgraph.ShortestPath(s, t)};
  }

  // Returns a string of the graph with `node0_char` at node `node0` and
  // `node1_char` at node `node1`. If `node0` is not a valid node (e.g., -1),
  // `node0_char` does not appear anywhere. Same with `node1_char`. `node0_char`
  // and `node1_char` are variable so that they can represent different things
  // depending in context, e.g., the positions of the players, or the source and
  // destination of a shortest path.
  std::string AsPrettyString(int node0, int node1, char node0_char,
                             char node1_char) const {
    int g0 = BottomRightNode(R, C), g1 = BottomLeftNode(R, C);
    std::string node0_str = std::string(1, node0_char);
    std::string node1_str = std::string(1, node1_char);
    std::string res;
    for (int row = 0; row < R; ++row) {
      // One line for cells and horizontal edges.
      for (int col = 0; col < C; ++col) {
        int node = NodeAt(C, row, col);
        std::string node_str;
        if (node0 == node && node1 == node)
          node_str = node0_str + node1_str;
        else if (node0 == node && (g0 == node || g1 == node))
          node_str = node0_str + "*";
        else if (node1 == node && (g0 == node || g1 == node))
          node_str = "*" + node1_str;
        else if (node0 == node)
          node_str = node0_str + " ";
        else if (node1 == node)
          node_str = " " + node1_str;
        else if (g0 == node || g1 == node)
          node_str = "**";
        else
          node_str = "  ";
        res += node_str;

        // Horizontal edge to the right.
        if (col < C - 1) {
          res += edges[EdgeRight(C, node)] ? " " : "|";
        } else {
          res += "\n";
        }
      }
      // One line for vertical edges and pillars between 4 walls.
      if (row == R - 1) continue;
      for (int col = 0; col < C; ++col) {
        int node = NodeAt(C, row, col);
        res += edges[EdgeBelow(R, C, node)] ? "  " : "--";
        // "Pillar" between 4 walls.
        if (col < C - 1) {
          res += "+";
        }
      }
      res += "\n";
    }
    return res;
  }

  // Prints the graph as a pretty string to the standard output.
  void PrettyPrint(int node0, int node1, char node0_char,
                   char node1_char) const {
    std::cout << AsPrettyString(node0, node1, node0_char, node1_char);
  }

 private:
  struct BridgesState {
    // DFS visit order, or -1 for unvisited yet.
    std::array<int, NumNodes(R, C)> rank;
    int next_rank;
    // Lowest-rank node reachable with a single back-edge in the subtree rooted
    // at each node.
    std::array<int, NumNodes(R, C)> low_link;
    std::bitset<NumRealAndFakeEdges(R, C)> bridges;
  };

  void BridgesDFS(int node, int parent, BridgesState& state) const {
    state.rank[node] = state.low_link[node] = state.next_rank++;
    for (int nbr : GetNeighbors(node)) {
      if (nbr == -1 || nbr == parent) continue;
      int node_to_nbr_edge = EdgeBetweenNeighbors(R, C, node, nbr);
      if (state.rank[nbr] != -1) {  // node->nbr is a back-edge
        state.low_link[node] = std::min(state.low_link[node], state.rank[nbr]);
      } else {
        // node->nbr is a tree edge. Follow it & visit nbr recursively.
        BridgesDFS(nbr, node, state);
        state.low_link[node] =
            std::min(state.low_link[node], state.low_link[nbr]);
        if (state.low_link[nbr] > state.rank[node]) {
          // The edge node->nbr is a bridge.
          state.bridges.set(node_to_nbr_edge);
        }
      }
    }
  }
};

// Converts a path to a bitset. The path is in the format returned by
// `ShortestPath`.
template <int R, int C>
inline std::ostream& operator<<(std::ostream& os, const Graph<R, C>& G) {
  return os << G.AsPrettyString(-1, -1, '-', '-');
}

}  // namespace wallwars

#endif  // GRAPH_H_
