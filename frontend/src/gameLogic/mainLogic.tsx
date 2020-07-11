/* In-game coordinate system:
Walls and junctions between four cells (called pillars) also count for the coordinate
system, so the number of rows/columns with "walkable" cells (called ground cells) is
actually half of the board's size (rounding up). Both dimensions of the board should
be odd, as they start and end with a row / column of walkable cells.
The first coordinate is the row (y-axis / height), denoted with variable r by convention.
The second coordinate is the column (x-axis / width), denoted with variable c by convention.
*/

interface Pos {
  r: number;
  c: number;
}

export enum CellType {
  Ground,
  VWall,
  HWall,
  Pillar,
}

export function cellTypeByPos(pos: Pos): CellType {
  if (pos.r % 2 === 0 && pos.c % 2 === 0) return CellType.Ground;
  if (pos.r % 2 === 0 && pos.c % 2 === 1) return CellType.VWall;
  if (pos.r % 2 === 1 && pos.c % 2 === 0) return CellType.HWall;
  return CellType.Pillar; //case i%2 == 1 && j%2 == 1
}
