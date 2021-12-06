#include "graph.h"

#include <array>
#include <iostream>

Graph::Graph() {
  edges.set();
  for (int e = 0; e < NumRealAndFakeEdges(); e++) {
    if (!IsRealEdge(e)) {
      DeactivateEdge(e);
    }
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

int Graph::Distance(int s, int t) const {
  // Not thread-safe.
  static std::array<int, NumNodes()> dist;
  static std::array<int, NumNodes()> BFS_queue;
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

std::array<int, NumNodes()> Graph::Distances(int s) const {
  std::array<int, NumNodes()> dist;
  // Not thread-safe.
  static std::array<int, NumNodes()> BFS_queue;
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
  // std::cerr << "dist from " << s << std::endl;
  // for (int row = 0; row < kNumRows; row++) {
  //   for (int col = 0; col < kNumCols; col++) {
  //     int node = NodeAtCoordinates(row, col);
  //     std::cerr << dist[node] << " ";
  //   }
  //   std::cerr << std::endl;
  // }
  // std::cerr << std::endl;
  return dist;
}