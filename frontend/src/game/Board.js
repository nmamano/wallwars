import React, { useState } from "react";
import invert from "invert-color";

import { cellTypeByPos, posEq } from "../gameLogic/mainLogic";

//cosmetic parameters of the board
const displayParams = {
  groundColor: "#d2d2d2",
  groundHoverColor: "#fbe4D6",
  emptyWallColor: "#eaeaea",
  emptyWallHoverColor: "#f1bfa0",
  pillarColor: "#cccccc",
  playerIcons: ["face", "outlet"],
  borderStyle: "1px solid #00796d",
};

//stateless component to display the board. all the state is at GamePage
const Board = ({
  grid,
  ghostAction,
  premoveActions,
  playerColors: [color1, color2],
  playerPos: [p1, p2],
  goals: [g1, g2],
  handleClick,
  creatorToMove,
  groundSize,
  wallWidth,
  isDarkModeOn,
}) => {
  const dims = { h: grid.length, w: grid[0].length };
  const allPos = [];
  for (let r = 0; r < dims.h; r++)
    for (let c = 0; c < dims.w; c++) allPos[r * dims.w + c] = { r: r, c: c };

  const [icon1, icon2] = displayParams.playerIcons;
  const [repRows, repCols] = [(dims.h - 1) / 2, (dims.w - 1) / 2];

  const [hoveredCell, setHoveredCell] = useState(null);

  const handleMouseEnter = (pos) => {
    setHoveredCell(pos);
  };
  const handleMouseLeave = () => {
    setHoveredCell(null);
  };
  const iconSize = 0.8 * groundSize;
  let coordColor = "white";
  if (isDarkModeOn) coordColor = "black";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${repCols}, ${groundSize}px ${wallWidth}px) ${groundSize}px`,
        gridTemplateRows: `repeat(${repRows}, ${groundSize}px ${wallWidth}px) ${groundSize}px`,
        justifyContent: "center",
        gridArea: "board",
        MozUserSelect: "none",
        webkitUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    >
      {allPos.map((pos) => {
        const [p1Here, p2Here] = [posEq(pos, p1), posEq(pos, p2)];
        const [goal1Here, goal2Here] = [posEq(pos, g1), posEq(pos, g2)];
        //ghosts are the partial moves that are only displayed locally

        const ghostHere = ghostAction !== null && posEq(ghostAction, pos);
        const premoveHere =
          (premoveActions.length > 0 && posEq(premoveActions[0], pos)) ||
          (premoveActions.length > 1 && posEq(premoveActions[1], pos));

        //premoves are treated as ghost moves with respect to displaying them
        const [p1GhostHere, p2GhostHere] = [
          (ghostHere && creatorToMove) || (premoveHere && !creatorToMove),
          (ghostHere && !creatorToMove) || (premoveHere && creatorToMove),
        ];
        const cellType = cellTypeByPos(pos);

        let color;
        if (cellType === "Ground") {
          if (hoveredCell && posEq(pos, hoveredCell))
            color = displayParams.groundHoverColor;
          else color = displayParams.groundColor;
        } else if (cellType === "Wall") {
          if (hoveredCell && posEq(pos, hoveredCell))
            color = displayParams.emptyWallHoverColor;
          else color = displayParams.emptyWallColor;
        } else color = displayParams.pillarColor;
        if (isDarkModeOn) color = invert(color);

        let className = "";
        //add waves cosmetic effect when clicking a cell
        if (cellType === "Ground") className += " waves-effect waves-light";
        if (cellType === "Wall") className += " waves-effect waves-dark";

        const ghostOrPlayerHere =
          p1Here || p2Here || p1GhostHere || p2GhostHere;
        const anyIconHere = ghostOrPlayerHere || goal1Here || goal2Here;
        const coordFits = groundSize > 27 && !anyIconHere;
        const letterCoordHere =
          coordFits && pos.r === dims.h - 1 && pos.c % 2 === 0;
        const numberCoordHere =
          coordFits && pos.c === dims.w - 1 && pos.r % 2 === 0;
        const coordHere = letterCoordHere || numberCoordHere;
        //special coloring for Ground cells containing the goals goals
        if (goal1Here || goal2Here) {
          className = goal1Here ? color1 : color2;
          className += isDarkModeOn ? " darken-4" : " lighten-4";
        }
        //wall coloring for built walls (depending on builder)
        if (cellType === "Wall") {
          const solidWallHere = grid[pos.r][pos.c] !== 0;
          if (solidWallHere || ghostHere || premoveHere) {
            if (solidWallHere) {
              className = grid[pos.r][pos.c] === 1 ? color1 : color2;
              className += isDarkModeOn ? "" : " darken-3";
            } else if (ghostHere) {
              className = creatorToMove ? color1 : color2;
              className += isDarkModeOn ? " lighten-2" : " lighten-3";
            } else {
              className = !creatorToMove ? color1 : color2;
              className += isDarkModeOn ? " lighten-2" : " lighten-3";
            }
          }
        }

        let justifyContent = "center";
        if (coordHere) justifyContent = letterCoordHere ? "start" : "flex-end";
        let alignItems = "center";
        if (coordHere) alignItems = letterCoordHere ? "flex-end" : "flex-start";

        return (
          <div
            className={className}
            key={`cell_${pos.r}_${pos.c}`}
            onClick={() => {
              if (cellType !== "Pillar" && handleClick !== null)
                handleClick(pos);
            }}
            onMouseEnter={() => handleMouseEnter(pos)}
            onMouseLeave={handleMouseLeave}
            style={{
              backgroundColor: color,
              display: "flex",
              justifyContent: justifyContent,
              alignItems: alignItems,
              cursor: "pointer",
              borderTop: pos.r === 0 ? displayParams.borderStyle : "",
              borderBottom:
                pos.r === dims.h - 1 ? displayParams.borderStyle : "",
              borderLeft: pos.c === 0 ? displayParams.borderStyle : "",
              borderRight:
                pos.c === dims.w - 1 ? displayParams.borderStyle : "",
            }}
          >
            {p1Here && (
              <i
                className={`material-icons ${color1}-text`}
                style={{ fontSize: `${iconSize}px` }}
              >
                {icon1}
              </i>
            )}
            {p2Here && (
              <i
                className={`material-icons ${color2}-text`}
                style={{ fontSize: `${iconSize}px` }}
              >
                {icon2}
              </i>
            )}
            {goal1Here && !ghostOrPlayerHere && (
              <i
                className={`material-icons white-text`}
                style={{ fontSize: `${iconSize}px` }}
              >
                {icon1}
              </i>
            )}
            {goal2Here && !ghostOrPlayerHere && (
              <i
                className={`material-icons white-text`}
                style={{ fontSize: `${iconSize}px` }}
              >
                {icon2}
              </i>
            )}
            {p1GhostHere && cellType === "Ground" && (
              <i
                className={`material-icons ${color1}-text text-lighten-4`}
                style={{ fontSize: `${iconSize}px` }}
              >
                {icon1}
              </i>
            )}
            {p2GhostHere && cellType === "Ground" && (
              <i
                className={`material-icons ${color2}-text text-lighten-4`}
                style={{ fontSize: `${iconSize}px` }}
              >
                {icon2}
              </i>
            )}
            {letterCoordHere && (
              <div
                style={{ color: coordColor, padding: "0", marginLeft: "4px" }}
              >
                {String.fromCharCode(97 + pos.c / 2)}
              </div>
            )}
            {numberCoordHere && (
              <div
                style={{ color: coordColor, padding: "0", marginRight: "4px" }}
              >
                {"" + (1 + pos.r / 2)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Board;
