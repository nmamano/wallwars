#ifndef HUMAN_H_
#define HUMAN_H_

#include "mover.h"
#include "situation.h"

// A mover that reads moves from the standard input.
class Human : public Mover {
 public:
  Move GetMove(Situation sit) override;
};

#endif  // HUMAN_H_