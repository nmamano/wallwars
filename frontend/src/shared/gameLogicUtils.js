//pure functions that compute things related to the game's logic

import { roundNum } from "../shared/utils";

/* Internal coordinate system:
Walls and junctions between four "walkable" cells (called pillars) also count as cells for the coordinate
system, so the number of rows/columns with "walkable" cells (called ground cells) is
actually half of the board's size (rounding up). Both dimensions of the board should
be odd, as they start and end with a row / column of walkable cells.
The first coordinate is the row (y-axis / height).
The second coordinate is the column (x-axis / width).

In the "classic" coordinate system, rows/columns with walls and pillar do not count.
The "classic" coordinate system is only ever used in the UI to interact with humans.
*/

export const cellEnum = {
  ground: 0,
  wall: 1,
  pillar: 2,
};

//maps 1->1, 3->2, 5->3, ...
export const internalToClassicBoardSize = (internalDim) => {
  return (internalDim + 1) / 2;
};
export const classicToInternalBoardSize = (classicDim) => {
  return 2 * classicDim - 1;
};

//maps 0->1, 2->2, 4->3, ...
export const internalToClassicCoord = (internalCoord) => {
  return internalCoord / 2 + 1;
};
export const classicToInternalCoord = (classicCoord) => {
  return 2 * (classicCoord - 1);
};

const boardPixelHeight = (dims, groundSize, wallWidth) =>
  (wallWidth * (dims[0] - 1)) / 2 + (groundSize * (dims[0] + 1)) / 2;
const boardPixelWidth = (dims, groundSize, wallWidth) =>
  (wallWidth * (dims[1] - 1)) / 2 + (groundSize * (dims[1] + 1)) / 2;
export const boardPixelDims = (dims, groundSize, wallWidth) => [
  boardPixelHeight(dims, groundSize, wallWidth),
  boardPixelWidth(dims, groundSize, wallWidth),
];

const emptyBoardDistance = (start, goal) => {
  const [rowDiff, colDiff] = [
    Math.abs(start[0] - goal[0]),
    Math.abs(start[1] - goal[1]),
  ];
  return (rowDiff + colDiff) / 2;
};
export const emptyBoardDistances = (boardSettings) => {
  return [
    emptyBoardDistance(boardSettings.startPos[0], boardSettings.goalPos[0]),
    emptyBoardDistance(boardSettings.startPos[1], boardSettings.goalPos[1]),
  ];
};
export const timeControlToString = (timeControl) => {
  return roundNum(timeControl.duration) + "+" + roundNum(timeControl.increment);
};
export function cellTypeByPos(pos) {
  if (pos[0] % 2 === 0 && pos[1] % 2 === 0) return cellEnum.ground;
  if (pos[0] % 2 !== pos[1] % 2) return cellEnum.wall;
  return cellEnum.pillar; //case i%2 === 1 && j%2 === 1
}

export function posEq(pos1, pos2) {
  return pos1[0] === pos2[0] && pos1[1] === pos2[1];
}

export function dimensions(grid) {
  return [grid.length, grid[0].length];
}

export function emptyGrid(dims) {
  let grid = [];
  for (let r = 0; r < dims[0]; r++) {
    grid[r] = [];
    for (let c = 0; c < dims[1]; c++) grid[r][c] = 0;
  }
  return grid;
}

export function inBounds(pos, dims) {
  return pos[0] >= 0 && pos[0] < dims[0] && pos[1] >= 0 && pos[1] < dims[1];
}

function isWallBuilt(grid, pos) {
  const cellType = cellTypeByPos(pos);
  if (cellType !== cellEnum.wall) return false; //cannot check for wall here
  return grid[pos[0]][pos[1]] !== 0;
}

function accessibleNeighbors(grid, pos) {
  const dims = dimensions(grid);
  if (cellTypeByPos(pos) !== cellEnum.ground) {
    return []; //only ground coords can access neighbors
  }
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];
  const res = [];
  const [pr, pc] = [pos[0], pos[1]];
  for (let k = 0; k < dirs.length; k++) {
    const [dr, dc] = [dirs[k][0], dirs[k][1]];
    const adjWall = [pr + dr, pc + dc];
    const adjGround = [pr + 2 * dr, pc + 2 * dc];
    if (inBounds(adjGround, dims) && !isWallBuilt(grid, adjWall)) {
      res.push(adjGround);
    }
  }
  return res;
}

export function distance(grid, start, target) {
  //implements bfs algorithm
  if (posEq(start, target)) return 0;
  const C = grid[0].length;
  const posToKey = (pos) => pos[0] * C + pos[1];

  const queue = [];
  let i = 0;
  queue.push(start);
  const dist = new Map();
  dist.set(posToKey(start), 0);
  while (i < queue.length) {
    const pos = queue[i];
    i++;
    const nbrs = accessibleNeighbors(grid, pos);
    for (let k = 0; k < nbrs.length; k++) {
      let nbr = nbrs[k];
      if (!dist.has(posToKey(nbr))) {
        dist.set(posToKey(nbr), dist.get(posToKey(pos)) + 1);
        if (posEq(nbr, target)) return dist.get(posToKey(nbr));
        queue.push(nbr);
      }
    }
  }
  return -1;
}

//same as distance, but with early termination
export function isDistanceAtMost(grid, start, target, maxDistance) {
  //implements bfs algorithm
  if (posEq(start, target)) return 0;
  const C = grid[0].length;
  const posToKey = (pos) => pos[0] * C + pos[1];

  const queue = [];
  let i = 0;
  queue.push(start);
  const dist = new Map();
  dist.set(posToKey(start), 0);
  while (i < queue.length) {
    const pos = queue[i];
    i++;
    const dis = dist.get(posToKey(pos));
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

function canReach(grid, start, target) {
  return distance(grid, start, target) !== -1;
}

//can handle more than 2 players, which is not used for now
function isValidBoard(grid, playerPos, goals) {
  for (let k = 0; k < playerPos.length; k++) {
    if (!canReach(grid, playerPos[k], goals[k])) return false;
  }
  return true;
}

export function canBuildWall(grid, playerPos, goals, pos) {
  if (isWallBuilt(grid, pos)) return false;
  grid[pos[0]][pos[1]] = 1; //grid parameter is only modified in this scope
  var res = isValidBoard(grid, playerPos, goals);
  grid[pos[0]][pos[1]] = 0;
  return res;
}

export function rowNotation(pos) {
  if (pos[0] === 18) return "X";
  return "" + (2 + pos[0]) / 2;
}

export function columnNotation(pos) {
  return String.fromCharCode(97 + pos[1] / 2);
}

export function actionNotation(pos) {
  if (cellTypeByPos(pos) === cellEnum.ground)
    return columnNotation(pos) + rowNotation(pos);
  else {
    const isVWall = pos[1] % 2 === 1;
    if (isVWall)
      return columnNotation([pos[0], pos[1] - 1]) + rowNotation(pos) + ">";
    else return columnNotation(pos) + rowNotation([pos[0] - 1, pos[1]]) + "v";
  }
}

export function moveNotation(actions) {
  if (actions.length === 1) return actionNotation(actions[0]);
  const [a1, a2] = actions;
  //canonical order: ground moves first, then sorted by increasing columns,
  //then sorted by decreasing rows
  const a1First =
    cellTypeByPos(a1) === cellEnum.ground ||
    (cellTypeByPos(a2) !== cellEnum.ground &&
      (a1[1] < a2[1] || (a1[1] === a2[1] && a1[0] < a2[0])));
  return a1First
    ? actionNotation(a1) + " " + actionNotation(a2)
    : actionNotation(a2) + " " + actionNotation(a1);
}
