#ifndef WALKER_H_
#define WALKER_H_

#include "mover.h"
#include "situation.h"

// A dummy AI that simply walks towards its goal.
class Walker : public Mover {
 public:
  Move GetMove(Situation sit) override;
};

#endif  // WALKER_H_