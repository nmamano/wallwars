#ifndef MOVER_H_
#define MOVER_H_

#include <array>

#include "graph.h"
#include "situation.h"

class Mover {
 public:
  virtual Move GetMove(Situation sit) = 0;
};

#endif  // MOVER_H_