//pure functions that compute things related to the game's logic

/* In-game coordinate system:
Walls and junctions between four cells (called pillars) also count for the coordinate
system, so the number of rows/columns with "walkable" cells (called ground cells) is
actually about half of the board's size. Both dimensions of the board should
be odd, as they start and end with a row / column of walkable cells.
The first coordinate is the row (y-axis / height), denoted with variable r by convention.
The second coordinate is the column (x-axis / width), denoted with variable c by convention.
*/

export function cellTypeByPos(pos) {
  if (pos.r % 2 === 0 && pos.c % 2 === 0) return "Ground";
  if (pos.r % 2 === 0 && pos.c % 2 === 1) return "Wall";
  if (pos.r % 2 === 1 && pos.c % 2 === 0) return "Wall";
  return "Pillar"; //case i%2 === 1 && j%2 === 1
}

export function posEq(pos1, pos2) {
  return pos1.r === pos2.r && pos1.c === pos2.c;
}

function dimensions(grid) {
  return { h: grid.length, w: grid[0].length };
}

export function emptyGrid(dims) {
  let grid = [];
  for (let r = 0; r < dims.h; r++) {
    grid[r] = [];
    for (let c = 0; c < dims.w; c++) grid[r][c] = 0;
  }
  return grid;
}

function inBounds(pos, dims) {
  return pos.r >= 0 && pos.r < dims.h && pos.c >= 0 && pos.c < dims.w;
}

function isWallBuilt(grid, pos) {
  const cellType = cellTypeByPos(pos);
  if (cellType !== "Wall") return false; //cannot check for wall here
  return grid[pos.r][pos.c] !== 0;
}

function accessibleNeighbors(grid, pos) {
  const dims = dimensions(grid);
  if (cellTypeByPos(pos) !== "Ground") {
    return []; //only ground coords can access neighbors
  }
  const dirs = [
    { r: 0, c: 1 },
    { r: 0, c: -1 },
    { r: 1, c: 0 },
    { r: -1, c: 0 },
  ];
  const res = [];
  const [pr, pc] = [pos.r, pos.c];
  for (let k = 0; k < dirs.length; k++) {
    const [dr, dc] = [dirs[k].r, dirs[k].c];
    const adjWall = { r: pr + dr, c: pc + dc };
    const adjGround = { r: pr + 2 * dr, c: pc + 2 * dc };
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
  const posToKey = (pos) => pos.r * C + pos.c;

  const queue = [];
  let i = 0;
  queue.push(start);
  const dist = new Map();
  dist.set(posToKey(start), 0);
  while (i < queue.length) {
    const pos = queue[i];
    i += 1;
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
  const posToKey = (pos) => pos.r * C + pos.c;

  const queue = [];
  let i = 0;
  queue.push(start);
  const dist = new Map();
  dist.set(posToKey(start), 0);
  while (i < queue.length) {
    const pos = queue[i];
    i += 1;
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
  grid[pos.r][pos.c] = 1; //grid parameter is only modified in this scope
  var res = isValidBoard(grid, playerPos, goals);
  grid[pos.r][pos.c] = 0;
  return res;
}

export function rowNotation(pos) {
  if (pos.r === 0) return "X";
  return "" + (10 - pos.r / 2);
}

export function columnNotation(pos) {
  return String.fromCharCode(97 + pos.c / 2);
}

export function actionNotation(pos) {
  if (cellTypeByPos(pos) === "Ground")
    return columnNotation(pos) + rowNotation(pos);
  else {
    const isVWall = pos.c % 2 === 1;
    if (isVWall)
      return (
        columnNotation({ r: pos.r, c: pos.c - 1 }) +
        columnNotation({ r: pos.r, c: pos.c + 1 }) +
        rowNotation(pos)
      );
    else
      return (
        columnNotation(pos) +
        rowNotation({ r: pos.r + 1, c: pos.c }) +
        rowNotation({ r: pos.r - 1, c: pos.c })
      );
  }
}

export function moveNotation(actions) {
  if (actions.length === 1) return actionNotation(actions[0]);
  const [a1, a2] = actions;
  //canonical order: ground moves first, then sorted by increasing columns,
  //then sorted by decreasing rows
  const a1First =
    cellTypeByPos(a1) === "Ground" ||
    cellTypeByPos(a1) !== "Ground" ||
    a1.c < a2.c ||
    (a1.c === a2.c && a1.r > a2.r);
  return a1First
    ? actionNotation(a1) + " " + actionNotation(a2)
    : actionNotation(a2) + " " + actionNotation(a1);
}
