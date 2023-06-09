import { Pos, Move, BoardSettings, posEq } from "../shared/gameLogicUtils";
import { turnCount, GameState } from "./gameState";
import { classicToInternalBoardDims } from "../shared/gameLogicUtils";

export type BoardSettingsStandardNotation = {
  dims: [number, number];
  startPos: [string, string];
  goalPos: [string, string];
};

export type Puzzle = {
  id: string;
  author: string;
  difficulty: number;
  boardSettings: BoardSettingsStandardNotation;
  creatorStarts: boolean;
  playAsCreator: boolean;
  moves: string;
  startIndex: number;
};

// Each entry is a list of alternative moves at each position.
// All the alternative moves are valid at each position.
export type PuzzleMoveList = Move[][];

export function lastPuzzleMoveIsCorrect(
  state: GameState,
  puzzle: Puzzle
): boolean {
  const tc = turnCount(state);
  if (tc === 0) return true; // No moves played yet.
  const moves = parsePuzzleMoveList(puzzle.moves);
  if (tc < puzzle.startIndex) return true;
  for (let i = 0; i < moves[tc - 1].length; i++) {
    if (isSameMove(moves[tc - 1][i], state.moveHistory[tc].actions))
      return true;
  }
  return false;
}

export function parsePuzzleMoveList(moveListStr: string): PuzzleMoveList {
  // A list where each entry is a string representing a list of alternative moves.
  const moveStrList = moveListStr.split(";");

  // A list where each entry is a list of strings representing the alternative moves.
  const alternativeMoveStrListList = moveStrList.map((moveStr) =>
    moveStr.split(",")
  );

  let res: PuzzleMoveList = [];
  alternativeMoveStrListList.forEach((alternativeMoveStrList) => {
    let alternativeMoves: Move[] = [];
    alternativeMoveStrList.forEach((moveStr) => {
      alternativeMoves.push(parseMoveString(moveStr));
    });
    res.push(alternativeMoves);
  });
  return res;
}

export function puzzleBoardSettingsToInternalBoardSettings(
  puzzleBoardSettings: BoardSettingsStandardNotation
): BoardSettings {
  return {
    dims: classicToInternalBoardDims(puzzleBoardSettings.dims),
    startPos: [
      actionStrToCoordinates(puzzleBoardSettings.startPos[0]),
      actionStrToCoordinates(puzzleBoardSettings.startPos[1]),
    ],
    goalPos: [
      actionStrToCoordinates(puzzleBoardSettings.goalPos[0]),
      actionStrToCoordinates(puzzleBoardSettings.goalPos[1]),
    ],
  };
}

// =========================
// Internal functions.
// =========================

function isSameMove(actions1: Pos[], actions2: Pos[]): boolean {
  if (actions1.length !== actions2.length) return false;
  if (actions1.length === 1) return posEq(actions1[0], actions2[0]);
  return (
    (posEq(actions1[0], actions2[0]) && posEq(actions1[1], actions2[1])) ||
    (posEq(actions1[0], actions2[1]) && posEq(actions1[1], actions2[0]))
  );
}

function actionStrToCoordinates(actionStr: string): Pos {
  const colLetter = actionStr[0].toLowerCase();
  const rowNum = actionStr[1];
  let internalRowIdx =
    ((rowNum === "x" || rowNum === "X" ? 10 : +rowNum) - 1) * 2;
  let internalColIdx = (colLetter.charCodeAt(0) - 97) * 2;
  if (actionStr.length === 3) {
    if (actionStr[2] === "v" || actionStr[2] === "V") {
      internalRowIdx++;
    } else if (actionStr[2] === ">") {
      internalColIdx++;
    } else {
      console.error("actionStrToCoordinates error: ", actionStr);
    }
  }
  return [internalRowIdx, internalColIdx];
}

function parseMoveString(moveStr: string): Move {
  const actionStrs = moveStr.trim().split(" ");
  let res: Move = [];
  actionStrs.forEach((actionStr) => {
    res.push(actionStrToCoordinates(actionStr));
  });
  return res;
}
