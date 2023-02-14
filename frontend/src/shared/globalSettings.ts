import { BoardDims, BoardSettings, Pos } from "./gameLogicUtils";

// Settings that are fixed.

export function defaultInitialPlayerPos(dims: BoardDims): [Pos, Pos] {
  const c = corners(dims);
  return [c[0], c[1]];
}

export function defaultGoalPos(dims: BoardDims): [Pos, Pos] {
  const c = corners(dims);
  return [c[2], c[3]];
}

const defaultBoardDims: BoardDims = [15, 19];

export const defaultBoardSettings: BoardSettings = {
  dims: defaultBoardDims,
  startPos: defaultInitialPlayerPos(defaultBoardDims),
  goalPos: defaultGoalPos(defaultBoardDims),
};

export const maxBoardDims: BoardDims = [19, 23];

export const cellSizes = {
  groundSize: 37, // In pixels.
  wallWidth: 12, // In pixels.
  smallScreenGroundSize: 23, // In pixels.
  smallScreenWallWidth: 10, // In pixels.
} as const;

function corners(dims: BoardDims): [Pos, Pos, Pos, Pos] {
  return [
    [0, 0],
    [0, dims[1] - 1],
    [dims[0] - 1, dims[1] - 1],
    [dims[0] - 1, 0],
  ];
}
