//settings that are fixed

function corners(dims) {
  return [
    [0, 0],
    [0, dims[1] - 1],
    [dims[0] - 1, dims[1] - 1],
    [dims[0] - 1, 0],
  ];
}
export const defaultInitialPlayerPos = (dims) => {
  const c = corners(dims);
  return [c[0], c[1]];
};
export const defaultGoalPos = (dims) => {
  const c = corners(dims);
  return [c[2], c[3]];
};
const defaultBoardDims = [15, 19];

export const defaultBoardSettings = {
  dims: defaultBoardDims,
  startPos: defaultInitialPlayerPos(defaultBoardDims),
  goalPos: defaultGoalPos(defaultBoardDims),
};

export const maxBoardDims = [19, 23];
export const cellSizes = {
  groundSize: 37, //in pixels
  wallWidth: 12, //in pixels
  smallScreenGroundSize: 23, //in pixels
  smallScreenWallWidth: 10, //in pixels
};
