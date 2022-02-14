import {
  defaultInitialPlayerPos,
  defaultGoalPos,
} from "../shared/globalSettings";
import {
  classicToInternalPos,
  classicToInternalBoardDims,
} from "../shared/gameLogicUtils";

const puzzle1 = {
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
};

const puzzle2 = {
  author: "Nilo",
  difficulty: 1650,
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
};

export const puzzles = [puzzle1, puzzle2];
