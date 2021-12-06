#include "walker.h"

#include "graph.h"
#include "situation.h"

Move Walker::GetMove(Situation sit) {
  int p = sit.tokens[sit.turn];
  int g = kGoals[sit.turn];
  if (sit.G.Distance(p, g) >= 2) {
    auto dist = sit.G.Distances(g);
    int cur_dist = dist[p];
    for (int node = 0; node < NumNodes(); ++node) {
      if (dist[node] == cur_dist - 2) {
        return {node - p, {-1, -1}};
      }
    }
  }
  // Edge case: the computer is at distance 1 from the goal, so, in addition
  // to moving to it, it needs to place a wall for its second action. It can
  // place the wall between its current position and the goal.
  return {g - p, {EdgeBetweenNeighbors(p, g), -1}};
}