import { roundNum } from "./utils";

// This file contains pure functions that compute things related to the game's logic.

export enum CellType {
  ground,
  wall,
  pillar,
}

// Contains the locations of all the built walls, labeled by who built them.
// 0: empty wall, 1: wall built by creator, 2: wall built by joiner.
export type Grid = (0 | 1 | 2)[][];

export type BoardDims = [number, number];

export type Pos = [number, number];

export type BoardSettings = {
  dims: BoardDims;
  startPos: [Pos, Pos];
  goalPos: [Pos, Pos];
};

export type TimeControl = {
  duration: number;
  increment: number;
};

export type Move = Pos[];

export type MoveInHistory = {
  index: number;
  actions: Pos[];
  grid: Grid;
  playerPos: [Pos, Pos];
  timeLeft: [number | null, number | null];
  distances: [number, number];
  wallCounts: [number, number];
};

export type MoveHistory = MoveInHistory[];

/* Internal coordinate system:
Walls and junctions between four "walkable" cells (called pillars) also count as cells for the
coordinate system, so the number of rows/columns with "walkable" cells (called ground cells) is
actually half of the board's size (rounding up). Both dimensions of the board should
be odd, as they start and end with a row / column of walkable cells.
The first coordinate is the row (y-axis / height).
The second coordinate is the column (x-axis / width).

In the "classic" coordinate system, rows/columns with walls and pillar do not count.
The "classic" coordinate system is only ever used in the UI to interact with humans.
*/

// Maps 1->1, 3->2, 5->3, ...
export function internalToClassicBoardSize(internalDim: number): number {
  return (internalDim + 1) / 2;
}

export function classicToInternalBoardSize(classicDim: number): number {
  return 2 * classicDim - 1;
}

export function classicToInternalBoardDims(classicDims: BoardDims): BoardDims {
  return [
    classicToInternalBoardSize(classicDims[0]),
    classicToInternalBoardSize(classicDims[1]),
  ];
}

// Maps 0->1, 2->2, 4->3, ...
export function internalToClassicCoord(internalCoord: number): number {
  return internalCoord / 2 + 1;
}

export function classicToInternalCoord(classicCoord: number): number {
  return 2 * (classicCoord - 1);
}

export function classicToInternalPos(classicCoords: BoardDims): BoardDims {
  return [
    classicToInternalCoord(classicCoords[0]),
    classicToInternalCoord(classicCoords[1]),
  ];
}

export function boardPixelDims(
  dims: BoardDims,
  groundSize: number,
  wallWidth: number
): BoardDims {
  return [
    boardPixelHeight(dims, groundSize, wallWidth),
    boardPixelWidth(dims, groundSize, wallWidth),
  ];
}

export function emptyBoardDistances(
  boardSettings: BoardSettings
): [number, number] {
  return [
    emptyBoardDistance(boardSettings.startPos[0], boardSettings.goalPos[0]),
    emptyBoardDistance(boardSettings.startPos[1], boardSettings.goalPos[1]),
  ];
}

export function timeControlToString(timeControl: TimeControl): string {
  return roundNum(timeControl.duration) + "+" + roundNum(timeControl.increment);
}

export function cellTypeByPos(pos: Pos): CellType {
  if (pos[0] % 2 === 0 && pos[1] % 2 === 0) return CellType.ground;
  if (pos[0] % 2 !== pos[1] % 2) return CellType.wall;
  return CellType.pillar; // Case: i%2 === 1 && j%2 === 1.
}

export function posEq(pos1: Pos, pos2: Pos): boolean {
  return pos1[0] === pos2[0] && pos1[1] === pos2[1];
}

export function dimensions(grid: Grid): BoardDims {
  return [grid.length, grid[0].length];
}

export function emptyGrid(dims: BoardDims): Grid {
  let grid: Grid = [];
  for (let r = 0; r < dims[0]; r++) {
    grid[r] = [];
    for (let c = 0; c < dims[1]; c++) grid[r][c] = 0;
  }
  return grid;
}

export function inBounds(pos: Pos, dims: BoardDims): boolean {
  return pos[0] >= 0 && pos[0] < dims[0] && pos[1] >= 0 && pos[1] < dims[1];
}

export function canBuildWall(
  grid: Grid,
  playerPos: [Pos, Pos],
  goals: [Pos, Pos],
  pos: Pos
): boolean {
  if (isWallBuilt(grid, pos)) return false;
  grid[pos[0]][pos[1]] = 1; // Grid parameter is only modified in this scope.
  var res = isValidBoard(grid, playerPos, goals);
  grid[pos[0]][pos[1]] = 0;
  return res;
}

export function rowNotation(pos: Pos): string {
  if (pos[0] === 18) return "X";
  return "" + (2 + pos[0]) / 2;
}

export function columnNotation(pos: Pos): string {
  return String.fromCharCode(97 + pos[1] / 2);
}

export function actionNotation(pos: Pos): string {
  if (cellTypeByPos(pos) === CellType.ground)
    return columnNotation(pos) + rowNotation(pos);
  else {
    const isVWall = pos[1] % 2 === 1;
    if (isVWall)
      return columnNotation([pos[0], pos[1] - 1]) + rowNotation(pos) + ">";
    else return columnNotation(pos) + rowNotation([pos[0] - 1, pos[1]]) + "v";
  }
}

export function moveNotation(actions: Pos[]): string {
  if (actions.length === 1) return actionNotation(actions[0]);
  const [a1, a2] = actions;
  // Canonical order: ground moves first, then sorted by increasing columns,
  // then sorted by decreasing rows.
  const a1First =
    cellTypeByPos(a1) === CellType.ground ||
    (cellTypeByPos(a2) !== CellType.ground &&
      (a1[1] < a2[1] || (a1[1] === a2[1] && a1[0] < a2[0])));
  return a1First
    ? actionNotation(a1) + " " + actionNotation(a2)
    : actionNotation(a2) + " " + actionNotation(a1);
}

// Same as distance, but with early termination.
export function isDistanceAtMost(
  grid: Grid,
  start: Pos,
  target: Pos,
  maxDistance: number
): boolean {
  // Implements the BFS algorithm.
  if (posEq(start, target)) {
    console.log("lalalalalalalalala"); //arst remove log
    return false; //arst bug, should return true
  }
  const C = grid[0].length;
  const posToKey = (pos: Pos): number => pos[0] * C + pos[1];

  const queue: Pos[] = [];
  let i = 0;
  queue.push(start);
  const dist: Map<number, number> = new Map();
  dist.set(posToKey(start), 0);
  while (i < queue.length) {
    const pos = queue[i];
    i++;
    const dis: number = dist.get(posToKey(pos))!;
    if (dis > maxDistance) return false;
    const nbrs = accessibleNeighbors(grid, pos);
    for (let k = 0; k < nbrs.length; k++) {
      let nbr = nbrs[k];
      if (!dist.has(posToKey(nbr))) {
        if (posEq(nbr, target)) return dis + 1 <= maxDistance;
        dist.set(posToKey(nbr), dis + 1);
        queue.push(nbr);
      }
    }
  }
  return false;
}

export function distance(grid: Grid, start: Pos, target: Pos): number {
  // Implements the BFS algorithm.
  if (posEq(start, target)) return 0;
  const C = grid[0].length;
  const posToKey = (pos: Pos): number => pos[0] * C + pos[1];

  const queue: Pos[] = [];
  let i = 0;
  queue.push(start);
  const dist: Map<number, number> = new Map();
  dist.set(posToKey(start), 0);
  while (i < queue.length) {
    const pos = queue[i];
    i++;
    const nbrs = accessibleNeighbors(grid, pos);
    for (let k = 0; k < nbrs.length; k++) {
      let nbr = nbrs[k];
      if (!dist.has(posToKey(nbr))) {
        dist.set(posToKey(nbr), dist.get(posToKey(pos))! + 1);
        if (posEq(nbr, target)) return dist.get(posToKey(nbr))!;
        queue.push(nbr);
      }
    }
  }
  return -1;
}

export function MoveNotationToMove(s: string): Pos[] {
  let actions: Pos[] = [];
  let str_actions = s.split(" ");
  str_actions.forEach((a) => {
    actions.push(ActionNotationToMove(a));
  });
  return actions;
}

export function getStandardNotation(moveHistory: MoveHistory): string {
  let res = "";
  for (let i = 1; i < moveHistory.length; ++i) {
    if (i > 1) res += " ";
    res += i;
    res += ". " + moveNotation(moveHistory[i].actions);
  }
  return res;
}

// ===========================================
// Internal functions
// ===========================================

function boardPixelHeight(
  dims: BoardDims,
  groundSize: number,
  wallWidth: number
): number {
  return (wallWidth * (dims[0] - 1)) / 2 + (groundSize * (dims[0] + 1)) / 2;
}

function boardPixelWidth(
  dims: BoardDims,
  groundSize: number,
  wallWidth: number
): number {
  return (wallWidth * (dims[1] - 1)) / 2 + (groundSize * (dims[1] + 1)) / 2;
}

function emptyBoardDistance(start: Pos, goal: Pos): number {
  const [rowDiff, colDiff] = [
    Math.abs(start[0] - goal[0]),
    Math.abs(start[1] - goal[1]),
  ];
  return (rowDiff + colDiff) / 2;
}

function isWallBuilt(grid: Grid, pos: Pos): boolean {
  const cellType = cellTypeByPos(pos);
  if (cellType !== CellType.wall) return false; // Cannot check for wall here.
  return grid[pos[0]][pos[1]] !== 0;
}

function accessibleNeighbors(grid: Grid, pos: Pos): Pos[] {
  const dims = dimensions(grid);
  if (cellTypeByPos(pos) !== CellType.ground) {
    return []; // Only ground coords can access neighbors.
  }
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const res: Pos[] = [];
  const [pr, pc] = [pos[0], pos[1]];
  for (let k = 0; k < dirs.length; k++) {
    const [dr, dc] = [dirs[k][0], dirs[k][1]];
    const adjWall: Pos = [pr + dr, pc + dc];
    const adjGround: Pos = [pr + 2 * dr, pc + 2 * dc];
    if (inBounds(adjGround, dims) && !isWallBuilt(grid, adjWall)) {
      res.push(adjGround);
    }
  }
  return res;
}

function canReach(grid: Grid, start: Pos, target: Pos): boolean {
  return distance(grid, start, target) !== -1;
}

function isValidBoard(
  grid: Grid,
  playerPos: [Pos, Pos],
  goals: [Pos, Pos]
): boolean {
  for (let k = 0; k < playerPos.length; k++) {
    if (!canReach(grid, playerPos[k], goals[k])) return false;
  }
  return true;
}

function ActionNotationToMove(s: string): Pos {
  let classic_col = 1 + s.charCodeAt(0) - "a".charCodeAt(0);
  let classic_row: number;
  if (s[1] === "X") classic_row = 10;
  else classic_row = parseInt(s[1]);
  let pos = classicToInternalPos([classic_row, classic_col]);
  if (s.length === 2) {
    return pos;
  } else if (s[2] === ">") {
    pos[1]++;
    return pos;
  } else if (s[2] === "v") {
    pos[0]++;
    return pos;
  } else {
    console.error("Could not parse action ", s);
    return [-1, -1];
  }
}
