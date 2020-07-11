import React from "react";
import { Icon } from "react-materialize";

import { CellType, cellTypeByPos } from "../gameLogic/mainLogic";

//all the cosmetic parameters of the board
const config = {
  cellSize: 40,
  wallWidth: 8,
  cellColor: "cyan lighten-4",
  pillarColor: "cyan lighten-3",
  emptyWallColor: "cyan lighten-5",
  playerIcons: ["face", "outlet"],
  playerColors: ["red", "indigo"],
};

//stateless component to display the board. all the state is at GamePage
const Board = (props) => {
  const grid = props.grid;
  const [p1, p2] = props.playerPos;
  const [g1, g2] = props.goals;

  const colorByCellType = (cellType, config) => {
    if (cellType === CellType.Ground) return config.cellColor;
    if (cellType === CellType.Pillar) return config.pillarColor;
    return config.emptyWallColor;
  };

  const dims = { h: grid.length, w: grid[0].length };
  const allPos = [];
  for (let r = 0; r < dims.h; r++)
    for (let c = 0; c < dims.w; c++) allPos[r * dims.w + c] = { r: r, c: c };

  const [cellpx, wallpx] = [config.cellSize, config.wallWidth];
  const [c1, c2] = config.playerColors;
  const [i1, i2] = config.playerIcons;
  const [repRows, repCols] = [(dims.h - 1) / 2, (dims.w - 1) / 2];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${repCols}, ${cellpx}px ${wallpx}px) ${cellpx}px`,
        gridTemplateRows: `repeat(${repRows}, ${cellpx}px ${wallpx}px) ${cellpx}px`,
        justifyContent: "center",
      }}
    >
      {allPos.map((pos) => {
        const p1Here = pos.r === p1.r && pos.c === p1.c;
        const p2Here = pos.r === p2.r && pos.c === p2.c;
        const g1Here = pos.r === g1.r && pos.c === g1.c;
        const g2Here = pos.r === g2.r && pos.c === g2.c;
        const cellType = cellTypeByPos(pos);
        let col = colorByCellType(cellType, config);
        if (g1Here) col = c1 + " lighten-4";
        if (g2Here) col = c2 + " lighten-4";
        const wallBuilder = grid[pos.r][pos.c];
        if (wallBuilder === 1) col = c1 + " darken-3";
        if (wallBuilder === 2) col = c2 + " darken-3";
        if (cellType === CellType.Ground) col += " waves-effect waves-light";
        if (cellType === CellType.VWall || cellType === CellType.HWall)
          col += " waves-effect waves-dark";
        return (
          <div
            className={col}
            key={`cell_${pos.r}_${pos.c}`}
            onClick={() => props.handleClick(pos)}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {p1Here && <Icon className={`${c1}-text small`}>{i1}</Icon>}
            {p2Here && <Icon className={`${c2}-text small`}>{i2}</Icon>}
            {g1Here && <Icon className="white-text small">{i1}</Icon>}
            {g2Here && <Icon className="white-text small">{i2}</Icon>}
          </div>
        );
      })}
    </div>
  );
};

export default Board;
