import {
  defaultInitialPlayerPos,
  defaultGoalPos,
} from "../shared/globalSettings";
import {
  classicToInternalPos,
  classicToInternalBoardDims,
} from "../shared/gameLogicUtils";

export const puzzles = [
  {
    author: "Nilo",
    difficulty: 1700,
    boardSettings: {
      dims: classicToInternalBoardDims([6, 5]),
      startPos: defaultInitialPlayerPos(classicToInternalBoardDims([6, 5])),
      goalPos: defaultGoalPos(classicToInternalBoardDims([6, 5])),
    },
    creatorStarts: false,
    playAsCreator: false,
    moves:
      "d2; b2; c3; c3; b3 b2v; b4v b4>; b5> b6>; a5v c2v; a1v a2v; a1> a2>; c3v d3v; d3 d2v; d5v e5v; e4; a4; d4 d4>, d4 d5>, d4 e4v, d4 c5>; b5; c5; a6",
    startIndex: 12,
  },
  {
    author: "Nilo",
    difficulty: 1750,
    boardSettings: {
      dims: classicToInternalBoardDims([3, 7]),
      startPos: [classicToInternalPos([2, 6]), classicToInternalPos([2, 2])],
      goalPos: defaultGoalPos(classicToInternalBoardDims([3, 7])),
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "a2> b2v; f2v f2>; a2v c2v, a1v c2v, a1> c2v; e2v g2v; c2> d1v; c2 e2>; e1; d1; d2; e2; e3; d3; g3",
    startIndex: 0,
  },
  {
    author: "Nilo",
    difficulty: 1550,
    boardSettings: {
      dims: classicToInternalBoardDims([5, 5]),
      startPos: defaultInitialPlayerPos(classicToInternalBoardDims([5, 5])),
      goalPos: defaultGoalPos(classicToInternalBoardDims([5, 5])),
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "d2> d3>; d4v d4>; b4v c4v; a3> a4>; a2> b1v; b2> b3>; c1> e1v, c1> e2v, c1> e3v, c1> e4v; d2; c2> c3>; d4; a3; c3; a5; c1; c5; a1; e5",
    startIndex: 6,
  },
  {
    author: "Nilo",
    difficulty: 1600,
    boardSettings: {
      dims: classicToInternalBoardDims([4, 5]),
      startPos: defaultInitialPlayerPos(classicToInternalBoardDims([4, 5])),
      goalPos: defaultGoalPos(classicToInternalBoardDims([4, 5])),
    },
    creatorStarts: true,
    playAsCreator: true,
    moves:
      "b2; d2; a4> b3v; b2v b2>; d3v d4>; d2v d2>; b4> c4>; a2> c2>; b3> c1>, a3> c1>; e1; c1; e3; c3; c3; e3; c1; e4 d1v, e4 d1>, e4 e1v, e4 e2v, e4 e3v, e4 d3>, e4 c3>, e4 c3v, e4 c2v, e4 c1v, e4 a3>, e4 b1v",
    startIndex: 8,
  },
  {
    author: "Nilo",
    difficulty: 1400,
    boardSettings: {
      dims: classicToInternalBoardDims([3, 7]),
      startPos: defaultInitialPlayerPos(classicToInternalBoardDims([3, 7])),
      goalPos: defaultGoalPos(classicToInternalBoardDims([3, 7])),
    },
    creatorStarts: true,
    playAsCreator: false,
    moves:
      "c1; e1; a1> a2>; f1> f2>; c1v d1v; c2v e1v; d2v e2v; b1v f2v, b1> f2v; e1; f2; f2; d2; d2; b2; b2; a3",
    startIndex: 7,
  },
].sort((p1, p2) => p1.difficulty - p2.difficulty);
