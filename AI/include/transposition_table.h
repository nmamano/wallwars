#ifndef TRANSPOSITION_TABLE_H_
#define TRANSPOSITION_TABLE_H_

#include <array>
#include <bitset>
#include <limits>

#include "constants.h"
#include "graph.h"
#include "situation.h"

namespace wallwars {

// Use this flag corresponding to an invalid turn to indicate an invalid/empty
// entry.
constexpr int kEmptyFlag = -1;

std::size_t kInvalidLocation = SIZE_MAX;

// Todo: improve hash function.
template <int R, int C>
std::size_t SituationHash(const Situation<R, C>& sit) {
  return (sit.tokens[0] | (sit.tokens[1] << 16)) ^
         std::hash<std::bitset<NumRealAndFakeEdges(R, C)>>{}(sit.G.edges);
}

// Alpha-beta flags.
constexpr int8_t kEmptyEntry = 0;
constexpr int8_t kExactFlag = 1;
constexpr int8_t kLowerboundFlag = 2;
constexpr int8_t kUpperboundFlag = 3;

template <int R, int C>
struct TTEntry {
  Situation<R, C> sit;
  // Indicates if the evaluation is exact, a lower bound, or an upper bound.
  // See the flag constants in `negamaxer.cc`.
  int8_t alpha_beta_flag = kEmptyEntry;
  // Depth of the eval. Higher (shallower) depths are based on a longer
  // lookahead, so they can be used for lower depths too. Depths up to 127 are
  // possible.
  int8_t depth;
  // Eval of a position. Evals with absolute value up to 32767 are possible.
  int16_t eval;
};

template <int R, int C>
constexpr int NumTTEntries() {
  long long size_bytes = kTranspositionTableMB * 1024LL * 1024LL;
  return size_bytes / sizeof(TTEntry<R, C>);
}

template <int R, int C>
class TranspositionTable {
 public:
  std::array<TTEntry<R, C>, NumTTEntries<R, C>()>* entries;

  TranspositionTable() {
    entries = new std::array<TTEntry<R, C>, NumTTEntries<R, C>()>;
  }
  ~TranspositionTable() { delete entries; }

  // returns the index in `entries` where `sit` should go.
  inline std::size_t Location(const Situation<R, C>& sit) {
    return SituationHash<R, C>(sit) % NumTTEntries<R, C>();
  }
  inline bool Contains(std::size_t location, const Situation<R, C>& sit) {
    return (*entries)[location].sit == sit;
  }
  inline bool IsEmpty(std::size_t location) {
    return (*entries)[location].alpha_beta_flag == kEmptyEntry;
  }

  // `location` should equal Location(sit).
  inline void Insert(std::size_t location, const Situation<R, C>& sit,
                     int8_t alpha_beta_flag, int8_t depth, int16_t eval) {
    (*entries)[location].sit = sit;
    (*entries)[location].alpha_beta_flag = alpha_beta_flag;
    (*entries)[location].depth = depth;
    (*entries)[location].eval = eval;
  }

  inline TTEntry<R, C>& Entry(std::size_t location) {
    return (*entries)[location];
  }
};

}  // namespace wallwars

#endif  // TRANSPOSITION_TABLE_H_