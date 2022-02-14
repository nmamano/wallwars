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

export const puzzles = [puzzle1];
