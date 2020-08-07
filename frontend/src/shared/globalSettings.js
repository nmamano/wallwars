//settings that, for now, are fixed

const [w, h] = [23, 19];
const corners = {
  tl: { r: 0, c: 0 },
  tr: { r: 0, c: w - 1 },
  bl: { r: h - 1, c: 0 },
  br: { r: h - 1, c: w - 1 },
};

export default {
  boardDims: { w: w, h: h },
  boardCorners: corners,
  //most data structures related to the players use an array
  //of length 2, with the data for the creator first
  initialPlayerPos: [corners.tl, corners.tr],
  goals: [corners.br, corners.bl],
  playerColors: ["red", "indigo"],
  groundSize: 37, //in pixels
  wallWidth: 12, //in pixels
  smallScreenGroundSize: 23,
  smallScreenWallWidth: 10,
};
