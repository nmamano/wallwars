import React from "react";
import { Icon } from "react-materialize";

import { cellTypeByPos, posEq } from "../gameLogic/mainLogic";

//cosmetic parameters of the board
const displayParams = {
  cellSize: 37,
  wallWidth: 11,
  cellColor: "cyan lighten-4",
  pillarColor: "cyan lighten-3",
  emptyWallColor: "cyan lighten-5",
  playerIcons: ["face", "outlet"],
};

//stateless component to display the board. all the state is at GamePage
const Board = ({
  grid,
  p1ToMove,
  ghostAction,
  playerColors: [color1, color2],
  playerPos: [p1, p2],
  goals: [g1, g2],
  handleClick,
}) => {
  const dims = { h: grid.length, w: grid[0].length };
  const allPos = [];
  for (let r = 0; r < dims.h; r++)
    for (let c = 0; c < dims.w; c++) allPos[r * dims.w + c] = { r: r, c: c };

  const [cellpx, wallpx] = [displayParams.cellSize, displayParams.wallWidth];
  const [icon1, icon2] = displayParams.playerIcons;
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
        const [p1Here, p2Here] = [posEq(pos, p1), posEq(pos, p2)];
        const [goal1Here, goal2Here] = [posEq(pos, g1), posEq(pos, g2)];
        //ghosts are the partial moves that are only displayed locally
        const ghostHere = ghostAction !== null && posEq(ghostAction, pos);
        const [p1GhostHere, p2GhostHere] = [
          ghostHere && p1ToMove,
          ghostHere && !p1ToMove,
        ];
        const cellType = cellTypeByPos(pos);

        let color;
        if (cellType === "Ground") color = displayParams.cellColor;
        else if (cellType === "Wall") color = displayParams.emptyWallColor;
        else color = displayParams.pillarColor;

        //special coloring for Ground cells containing the goals goals
        if (goal1Here) color = color1 + " lighten-4";
        if (goal2Here) color = color2 + " lighten-4";

        //wall coloring for built walls (depending on builder)
        if (cellType === "Wall") {
          const solidWallHere = grid[pos.r][pos.c] !== 0;
          if (solidWallHere || ghostHere) {
            if (solidWallHere) {
              color = grid[pos.r][pos.c] === 1 ? color1 : color2;
              color += " darken-3";
            } else {
              color = p1ToMove ? color1 : color2;
              color += " lighten-3";
            }
          }
        }

        //add waves cosmetic effect when clicking a cell
        if (cellType === "Ground") color += " waves-effect waves-light";
        if (cellType === "Wall") color += " waves-effect waves-dark";
        const isPillar = pos.r % 2 === 1 && pos.c % 2 === 1;
        const anyPHere = p1Here || p2Here || p1GhostHere || p2GhostHere;
        return (
          <div
            className={color}
            key={`cell_${pos.r}_${pos.c}`}
            onClick={() => {
              if (!isPillar) handleClick(pos);
            }}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {p1Here && <Icon className={`${color1}-text small`}>{icon1}</Icon>}
            {p2Here && <Icon className={`${color2}-text small`}>{icon2}</Icon>}
            {goal1Here && !anyPHere && (
              <Icon className="white-text small">{icon1}</Icon>
            )}
            {goal2Here && !anyPHere && (
              <Icon className="white-text small">{icon2}</Icon>
            )}
            {p1GhostHere && cellType === "Ground" && (
              <Icon className={`${color1}-text small text-lighten-4`}>
                {icon1}
              </Icon>
            )}
            {p2GhostHere && cellType === "Ground" && (
              <Icon className={`${color2}-text small text-lighten-4`}>
                {icon2}
              </Icon>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Board;
