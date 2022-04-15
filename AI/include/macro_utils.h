#ifndef MACRO_UTILS_H_
#define MACRO_UTILS_H_

#include <iostream>

namespace wallwars {

// Each macro has two versions LOGx and DBGx. They do the same thing, except
// that DBGx macros do nothing when the program is compiled with the -NDEBUG
// flag.

#define LOG(x)                                         \
  do {                                                 \
    std::cerr << __LINE__ << ": " << (x) << std::endl; \
  } while (0)

#ifdef NDEBUG
#define DBG(x) \
  do {         \
  } while (0)
#else
#define DBG(x)                                         \
  do {                                                 \
    std::cerr << __LINE__ << ": " << (x) << std::endl; \
  } while (0)
#endif

// "Log with function name". Same as log, but shows the function name.
#define LOGF(x)                                                             \
  do {                                                                      \
    std::cerr << __LINE__ << " > " << __func__ << ": " << (x) << std::endl; \
  } while (0)

#ifdef NDEBUG
#define DBGF(x) \
  do {          \
  } while (0)
#else
#define DBGF(x)                                                             \
  do {                                                                      \
    std::cerr << __LINE__ << " > " << __func__ << ": " << (x) << std::endl; \
  } while (0)
#endif

// "Log value". It shows an expression (or simply a variable) and its value.
#define LOGV(x)                                                 \
  do {                                                          \
    std::cerr << __LINE__ << ": " #x " = " << (x) << std::endl; \
  } while (0)

#ifdef NDEBUG
#define DBGV(x) \
  do {          \
  } while (0)
#else
#define DBGV(x)                                                 \
  do {                                                          \
    std::cerr << __LINE__ << ": " #x " = " << (x) << std::endl; \
  } while (0)
#endif

// "Log 2 values" macro
#define LOGV2(x, y)                                                       \
  do {                                                                    \
    std::cerr << __LINE__ << ": " #x " = " << (x) << "; " #y " = " << (y) \
              << std::endl;                                               \
  } while (0)

#ifdef NDEBUG
#define DBGV2(x, y) \
  do {              \
  } while (0)
#else
#define DBGV2(x, y)                                                       \
  do {                                                                    \
    std::cerr << __LINE__ << ": " #x " = " << (x) << "; " #y " = " << (y) \
              << std::endl;                                               \
  } while (0)
#endif

// "Log 3 values" macro
#define LOGV3(x, y, z)                                                    \
  do {                                                                    \
    std::cerr << __LINE__ << ": " #x " = " << (x) << "; " #y " = " << (y) \
              << "; " #z " = " << (z) << std::endl;                       \
  } while (0)

#ifdef NDEBUG
#define DBGV3(x, y, z) \
  do {                 \
  } while (0)
#else
#define DBGV3(x, y, z)                                                    \
  do {                                                                    \
    std::cerr << __LINE__ << ": " #x " = " << (x) << "; " #y " = " << (y) \
              << "; " #z " = " << (z) << std::endl;                       \
  } while (0)
#endif

// "Log line" macro
#define LOGL()                                                     \
  do {                                                             \
    std::cerr << __LINE__ << ": " << __FILE__ << " > " << __func__ \
              << std::endl;                                        \
  } while (0)

#ifdef NDEBUG
#define DBGL() \
  do {         \
  } while (0)
#else
#define DBGL()                                                     \
  do {                                                             \
    std::cerr << __LINE__ << ": " << __FILE__ << " > " << __func__ \
              << std::endl;                                        \
  } while (0)
#endif

// "Dbg evaluation" macro. It should receive an expression, which is only
// evaluated in debug mode.
#ifdef NDEBUG
#define DBGE(x) \
  do {          \
  } while (0)
#else
#define DBGE(x)                                \
  do {                                         \
    std::cerr << __LINE__ << ":" << std::endl; \
    (x);                                       \
  } while (0)
#endif

// "Dbg statement" macro. It should receive a statement, which is only
// executed in debug mode.
#ifdef NDEBUG
#define DBGS(x) \
  do {          \
  } while (0)
#else
#define DBGS(x) \
  do {          \
    { x; }      \
  } while (0)
#endif

}  // namespace wallwars

#endif  // MACRO_UTILS_H_