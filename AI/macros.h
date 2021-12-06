#ifndef MACROS_H_
#define MACROS_H_

#include <iostream>

#define DUMP(x)                                                 \
  do {                                                          \
    std::cerr << __LINE__ << ": " #x " = " << (x) << std::endl; \
  } while (0)

#endif  // MACROS_H_