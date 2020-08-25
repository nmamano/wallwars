import React, { useState } from "react";
import { useMediaQuery } from "react-responsive";

import { cellTypeByPos, posEq } from "../shared/gameLogicUtils";
import { getColor } from "../shared/colorThemes";

//stateless component to display the board. all the state is at GamePage
const Board = ({
  grid,
  ghostAction,
  premoveActions,
  playerPos: [p1, p2],
  goals: [g1, g2],
  handleClick,
  creatorToMove,
  groundSize,
  wallWidth,
  menuTheme,
  boardTheme,
  isDarkModeOn,
  tokens,
}) => {
  const canHover = useMediaQuery({ query: "(hover: none)" });

  //short-hand for getColor
  const getCol = (elem) => getColor(menuTheme, elem, isDarkModeOn);
  const getBoardCol = (elem) => getColor(boardTheme, elem, isDarkModeOn);

  const borderStyle = `1px solid ${getCol("container")}`;
  const [color1, color2] = [getBoardCol("player1"), getBoardCol("player2")];

  const defaultTokens = ["face", "outlet"];
  let [token1, token2] = tokens;
  if (token1 === "default") token1 = defaultTokens[0];
  if (token2 === "default") token2 = defaultTokens[1];

  const dims = { h: grid.length, w: grid[0].length };
  const allPos = [];
  for (let r = 0; r < dims.h; r++)
    for (let c = 0; c < dims.w; c++) allPos[r * dims.w + c] = { r: r, c: c };

  const [repRows, repCols] = [(dims.h - 1) / 2, (dims.w - 1) / 2];

  const [hoveredCell, setHoveredCell] = useState(null);

  const handleMouseEnter = (pos) => {
    setHoveredCell(pos);
  };
  const handleMouseLeave = () => {
    setHoveredCell(null);
  };
  const tokenSize = 0.8 * groundSize;
  const coordColor = getBoardCol("coord");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${repCols}, ${groundSize}px ${wallWidth}px) ${groundSize}px`,
        gridTemplateRows: `repeat(${repRows}, ${groundSize}px ${wallWidth}px) ${groundSize}px`,
        justifyContent: "center",
        gridArea: "board",
        MozUserSelect: "none",
        WebkitUserSelect: "none",
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

        //add waves cosmetic effect when clicking a cell
        let className = "";
        if (cellType === "Ground") className += "waves-effect waves-light";
        if (cellType === "Wall") className += "waves-effect waves-dark";

        const ghostOrPlayerHere =
          p1Here || p2Here || p1GhostHere || p2GhostHere;
        const anyIconHere = ghostOrPlayerHere || goal1Here || goal2Here;
        const coordFits = groundSize > 27 && !anyIconHere;
        const letterCoordHere =
          coordFits && pos.r === dims.h - 1 && pos.c % 2 === 0;
        const numberCoordHere =
          coordFits && pos.c === dims.w - 1 && pos.r % 2 === 0;
        const coordHere = letterCoordHere || numberCoordHere;

        let color;
        if (cellType === "Ground") {
          if (goal1Here || goal2Here) {
            color = getBoardCol(`goalBackground${goal1Here ? "1" : "2"}`);
          } else if (canHover && hoveredCell && posEq(pos, hoveredCell)) {
            color = getBoardCol("hoveredGround");
          } else {
            color = getBoardCol("ground");
          }
        } else if (cellType === "Wall") {
          const solidWallHere = grid[pos.r][pos.c] !== 0;
          if (solidWallHere) {
            color = getBoardCol(`wall${grid[pos.r][pos.c]}`);
          } else if (ghostHere) {
            color = getBoardCol(`ghostWall${creatorToMove ? "1" : "2"}`);
          } else if (premoveHere) {
            color = getBoardCol(`ghostWall${!creatorToMove ? "1" : "2"}`);
          } else if (canHover && hoveredCell && posEq(pos, hoveredCell)) {
            color = getBoardCol("hoveredWall");
          } else {
            color = getBoardCol("emptyWall");
          }
        } else color = getBoardCol("pillar");

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
              borderTop: pos.r === 0 ? borderStyle : "",
              borderBottom: pos.r === dims.h - 1 ? borderStyle : "",
              borderLeft: pos.c === 0 ? borderStyle : "",
              borderRight: pos.c === dims.w - 1 ? borderStyle : "",
            }}
          >
            {p1Here && (
              <i
                className={`material-icons`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: color1,
                }}
              >
                {token1}
              </i>
            )}
            {p2Here && (
              <i
                className={`material-icons`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: color2,
                }}
              >
                {token2}
              </i>
            )}
            {(goal1Here || goal2Here) && !ghostOrPlayerHere && (
              <i
                className={`material-icons`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: getBoardCol("goalToken"),
                }}
              >
                {goal1Here ? token1 : token2}
              </i>
            )}
            {(p1GhostHere || p2GhostHere) && cellType === "Ground" && (
              <i
                className={`material-icons ${color1}-text text-lighten-4`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: getBoardCol(`ghost${p1GhostHere ? "1" : "2"}`),
                }}
              >
                {p1GhostHere ? token1 : token2}
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
