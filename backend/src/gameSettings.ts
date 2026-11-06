// Checks the shape of what a client sends to create a game and to move.
// The server shows the game settings to every lobby visitor and keeps every
// move in memory, so a malformed value must not get in. The limits on the
// settings are the ones the lobby form allows.

// Minutes. The lobby form changes a duration under 0.1 to 5 seconds.
const minDuration = 5 / 60;
const maxDuration = 120;
// Seconds.
const maxIncrement = 300;
// Internal dimensions (2 * classic - 1): 2x2 to 10x12 in classic size.
const minBoardDim = 3;
const maxBoardDims = [19, 23];

function isNumberIn(x: unknown, min: number, max: number): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
}

export function isValidTimeControl(tc: unknown): boolean {
  if (typeof tc !== "object" || tc === null) return false;
  const { duration, increment } = tc as Record<string, unknown>;
  return (
    isNumberIn(duration, minDuration, maxDuration) &&
    isNumberIn(increment, 0, maxIncrement)
  );
}

// A board dimension is odd: ground cells and walls alternate.
function isValidDim(x: unknown, max: number): x is number {
  return Number.isInteger(x) && isNumberIn(x, minBoardDim, max) && x % 2 === 1;
}

// A player position or goal is a ground cell: both coordinates are even.
function isGroundCell(pos: unknown, dims: [number, number]): boolean {
  return (
    Array.isArray(pos) &&
    pos.length === 2 &&
    pos.every(
      (x, i) => Number.isInteger(x) && isNumberIn(x, 0, dims[i] - 1) && x % 2 === 0
    )
  );
}

function isPair(x: unknown): x is [unknown, unknown] {
  return Array.isArray(x) && x.length === 2;
}

export function isValidBoardSettings(bs: unknown): boolean {
  if (typeof bs !== "object" || bs === null) return false;
  const { dims, startPos, goalPos } = bs as Record<string, unknown>;
  if (!isPair(dims) || !isValidDim(dims[0], maxBoardDims[0])) return false;
  if (!isValidDim(dims[1], maxBoardDims[1])) return false;
  const d = dims as [number, number];
  return (
    isPair(startPos) &&
    isPair(goalPos) &&
    [...startPos, ...goalPos].every((pos) => isGroundCell(pos, d))
  );
}

// A real game is far shorter. The cap bounds the memory of one game.
export const maxMoves = 1000;

function isNumberOrNull(x: unknown): boolean {
  return x === null || (typeof x === "number" && Number.isFinite(x));
}

// A move is 1 or 2 actions, each a cell of the board. The clock and distances
// are as the client reports them (the server does not check the rules), but
// they must be numbers.
export function isWellFormedMove(
  dims: [number, number],
  actions: unknown,
  remainingTime: unknown,
  distances: unknown
): boolean {
  return (
    Array.isArray(actions) &&
    actions.length >= 1 &&
    actions.length <= 2 &&
    actions.every(
      (pos) =>
        Array.isArray(pos) &&
        pos.length === 2 &&
        pos.every((x, i) => Number.isInteger(x) && isNumberIn(x, 0, dims[i] - 1))
    ) &&
    isNumberOrNull(remainingTime) &&
    isPair(distances) &&
    distances.every(isNumberOrNull)
  );
}
