#include "graph.h"

#include <array>
#include <bitset>
#include <cassert>
#include <iostream>

#include "constants.h"
#include "macros.h"
#include "template_utils.h"

long long Graph::graph_traversal_count = 0;

Graph::Graph() {
  edges.set();
  for (int e = 0; e < kNumRealAndFakeEdges; e++) {
    if (!IsRealEdge(e)) DeactivateEdge(e);
  }
  for (int e : kRemovedEdges) {
    if (e == -1) return;
    DeactivateEdge(e);
  }
}

int Graph::NeighborInDirection(int v, int dir) const {
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

std::array<bool, kNumNodes> Graph::ActiveNodes() const {
  ++graph_traversal_count;
  std::array<bool, kNumNodes> active_nodes;
  active_nodes.fill(false);
  for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
    if (edges[edge]) {
      active_nodes[LowerEndpoint(edge)] = true;
      active_nodes[HigherEndpoint(edge)] = true;
    }
  }
  return active_nodes;
}

int Graph::Distance(int s, int t) const {
  ++graph_traversal_count;
  thread_local std::array<int, kNumNodes> BFS_queue;
  thread_local std::array<int, kNumNodes> dist;
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

std::array<int, kNumNodes> Graph::Distances(int s) const {
  ++graph_traversal_count;
  thread_local std::array<int, kNumNodes> BFS_queue;
  std::array<int, kNumNodes> dist;
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

std::array<int, 8> Graph::NodesAtDistance2(int s) const {
  thread_local std::array<int, kNumNodes> BFS_queue;
  thread_local std::array<int, kNumNodes> dist;
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

std::array<int, kNumNodes> Graph::ShortestPath(int s, int t) const {
  ++graph_traversal_count;
  thread_local std::array<int, kNumNodes> BFS_queue;
  thread_local std::array<int, kNumNodes> dist;
  thread_local std::array<int, kNumNodes> predecessor;
  std::array<int, kNumNodes> shortest_path;
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

std::array<int, kNumNodes> Graph::ShortestPathWithOrientations(
    int s, int t,
    const std::array<int, kNumRealAndFakeEdges>& orientations) const {
  ++graph_traversal_count;
  thread_local std::array<int, kNumNodes> BFS_queue;
  thread_local std::array<int, kNumNodes> dist;
  thread_local std::array<int, kNumNodes> predecessor;
  std::array<int, kNumNodes> shortest_path;
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
      int edge = EdgeBetweenNeighbors(node, nbr);
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

std::array<int, kNumNodes> Graph::ConnectedComponents() const {
  ++graph_traversal_count;
  thread_local std::array<int, kNumNodes> BFS_queue;
  std::array<int, kNumNodes> connected_components;
  connected_components.fill(-1);
  int cur_label = 0;
  for (int start_node = 0; start_node < kNumNodes; ++start_node) {
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

void Graph::BridgesDFS(int node, int parent, BridgesState& state) const {
  state.rank[node] = state.low_link[node] = state.next_rank++;
  for (int nbr : GetNeighbors(node)) {
    if (nbr == -1 || nbr == parent) continue;
    int node_to_nbr_edge = EdgeBetweenNeighbors(node, nbr);
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

std::bitset<kNumRealAndFakeEdges> Graph::Bridges() const {
  ++graph_traversal_count;
  static BridgesState state;
  state.rank.fill(-1);
  state.next_rank = 0;
  state.low_link.fill(-1);
  state.bridges.reset();
  for (int node = 0; node < kNumNodes; ++node) {
    if (state.rank[node] == -1) {
      BridgesDFS(node, -1, state);
    }
  }
  return std::bitset<kNumRealAndFakeEdges>{state.bridges};
}

std::array<int, kNumNodes> Graph::TwoEdgeConnectedComponents() const {
  const std::bitset<kNumRealAndFakeEdges> bridges = Bridges();
  Graph copy = *this;
  for (int edge = 0; edge < kNumRealAndFakeEdges; ++edge) {
    if (bridges[edge]) copy.DeactivateEdge(edge);
  }
  return copy.ConnectedComponents();
}

std::array<std::array<int, kNumNodes>, 2> Graph::TwoEdgeDisjointPaths(
    int s, int t) const {
  const std::array<int, kNumNodes> augmenting_path1 = ShortestPath(s, t);
  // Edges in `augmenting_path1` can only be used in the opposite orientation
  // when finding `augmenting_path2`.
  std::array<int, kNumRealAndFakeEdges> orientations;
  orientations.fill(0);
  for (int i = 0; i < kNumNodes - 1 && augmenting_path1[i + 1] != -1; ++i) {
    orientations[EdgeBetweenNeighbors(augmenting_path1[i],
                                      augmenting_path1[i + 1])] =
        augmenting_path1[i] < augmenting_path1[i + 1] ? -1 : 1;
  }
  const std::array<int, kNumNodes> augmenting_path2 =
      ShortestPathWithOrientations(s, t, orientations);

  // Now we have found two paths from `s` to `t`, which might overlap in some
  // edges, but only in opposite directions. By taking the xor of the edges in
  // the two paths, the edges that are traversed in both directions cancel out
  // and we are left with a set of edges that make up two disjoint paths without
  // any overlapping edges.
  Graph subgraph;
  subgraph.edges =
      PathAsEdgeSet(augmenting_path1) ^ PathAsEdgeSet(augmenting_path2);

  const std::array<int, kNumNodes> path1 = subgraph.ShortestPath(s, t);
  // Remove the edges in `path1` (using the formula A\B = A&(A^B) for sets).
  subgraph.edges &= subgraph.edges ^ PathAsEdgeSet(path1);
  return {path1, subgraph.ShortestPath(s, t)};
}

std::string Graph::AsPrettyString(int node0, int node1, char node0_char,
                                  char node1_char) const {
  int g0 = kBottomRightNode, g1 = kBottomLeftNode;
  std::string node0_str = std::string(1, node0_char);
  std::string node1_str = std::string(1, node1_char);
  std::string res;
  for (int row = 0; row < kNumRows; ++row) {
    // One line for cells and horizontal edges.
    for (int col = 0; col < kNumCols; ++col) {
      int node = NodeAt(row, col);
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
      if (col < kNumCols - 1) {
        res += edges[EdgeRight(node)] ? " " : "|";
      } else {
        res += "\n";
      }
    }
    // One line for vertical edges and pillars between 4 walls.
    if (row == kNumRows - 1) continue;
    for (int col = 0; col < kNumCols; ++col) {
      int node = NodeAt(row, col);
      res += edges[EdgeBelow(node)] ? "  " : "--";
      // "Pillar" between 4 walls.
      if (col < kNumCols - 1) {
        res += "+";
      }
    }
    res += "\n";
  }
  return res;
}

void Graph::PrettyPrint(int node0, int node1, char node0_char,
                        char node1_char) const {
  std::cout << AsPrettyString(node0, node1, node0_char, node1_char);
}

std::bitset<kNumRealAndFakeEdges> PathAsEdgeSet(
    std::array<int, kNumNodes> path) {
  std::bitset<kNumRealAndFakeEdges> edge_set;
  for (int i = 0; i < kNumNodes - 1 && path[i + 1] != -1; ++i) {
    edge_set.set(EdgeBetweenNeighbors(path[i], path[i + 1]));
  }
  return edge_set;
}
