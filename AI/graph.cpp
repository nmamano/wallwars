#include "graph.h"

#include <array>
#include <vector>

int Graph::Distance(int s, int t) const {
  if (s == t) return 0;
  std::array<int, MaxNumEdges()> dist;
  dist.fill(-1);
  dist[s] = 0;
  std::vector<int> Q{s};  // BFS queue.
  std::size_t Q_index = 0;
  while (Q_index < Q.size()) {
    int node = Q[Q_index++];
    for (int nbr : GetNeighbors(node)) {
      if (nbr != -1 && dist[nbr] == -1) {
        if (nbr == t) return dist[node] + 1;
        dist[nbr] = dist[node] + 1;
        Q.push_back(nbr);
      }
    }
  }
  return -1;
}

std::vector<int> Graph::Distances(int s) const {
  std::vector<int> dist(NumNodes(), -1);
  dist[s] = 0;
  std::vector<int> Q{s};  // BFS queue.
  std::size_t Q_index = 0;
  while (Q_index < Q.size()) {
    int node = Q[Q_index++];
    for (int nbr : GetNeighbors(node)) {
      if (nbr != -1 && dist[nbr] == -1) {
        dist[nbr] = dist[node] + 1;
        Q.push_back(nbr);
      }
    }
  }
  return dist;
}