import React, { useState } from "react";
import { useMediaQuery } from "react-responsive";

import { cellTypeByPos, posEq } from "../shared/gameLogicUtils";
import { getColor } from "../shared/colorThemes";

//stateless component to display the board. all the state is at GamePage
const Board = ({
  grid,
  ghostAction,
  premoveActions,
  lastActions,
  tracePos,
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
  const canHover = !useMediaQuery({ query: "(hover: none)" });
  const [hoveredCell, setHoveredCell] = useState(null);
  const handleMouseEnter = (pos) => {
    setHoveredCell(pos);
  };
  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

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

  const tokenSize = 0.8 * groundSize;
  const coordColor = getBoardCol("coord");

  const isOneOf = (pos, actions) => {
    // if (!actions) return false;
    if (actions.length > 0 && actions[0] && posEq(pos, actions[0])) return true;
    if (actions.length > 1 && actions[1] && posEq(pos, actions[1])) return true;
    return false;
  };

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
        const [player1Here, player2Here] = [posEq(pos, p1), posEq(pos, p2)];
        const [goal1Here, goal2Here] = [posEq(pos, g1), posEq(pos, g2)];
        const playerHere = player1Here || player2Here;
        const goalHere = goal1Here || goal2Here;
        const ghostHere = isOneOf(pos, [ghostAction]);
        const premoveHere = isOneOf(pos, premoveActions);
        const traceHere = tracePos && posEq(pos, tracePos);
        const lastMoveHere = isOneOf(pos, lastActions);
        const shadowHere = ghostHere || premoveHere;
        const anyIconHere = playerHere || goalHere || shadowHere;

        //premoves and ghost moves are displayed the same. We call
        //the combination of both "shadow"
        const [shadow1Here, shadow2Here] = [
          (ghostHere && creatorToMove) || (premoveHere && !creatorToMove),
          (ghostHere && !creatorToMove) || (premoveHere && creatorToMove),
        ];
        const [lastMove1Here, lastMove2Here] = [
          lastMoveHere && !creatorToMove,
          lastMoveHere && creatorToMove,
        ];

        const coordFits = groundSize > 27 && !anyIconHere;
        const letterCoordHere =
          coordFits && pos.r === dims.h - 1 && pos.c % 2 === 0;
        const numberCoordHere =
          coordFits && pos.c === dims.w - 1 && pos.r % 2 === 0;
        const coordHere = letterCoordHere || numberCoordHere;

        const hoveredHere = canHover && hoveredCell && posEq(pos, hoveredCell);

        //add waves cosmetic effect when clicking a cell
        const cellType = cellTypeByPos(pos);
        let className = "";
        if (cellType === "Ground") className += "waves-effect waves-light";
        if (cellType === "Wall") className += "waves-effect waves-dark";

        let color;
        if (cellType === "Ground") {
          if (hoveredHere) {
            color = getBoardCol("hoveredGround");
          } else if (traceHere) {
            color = getBoardCol("traceGround");
          } else if (goalHere) {
            color = getBoardCol(`goalBackground${goal1Here ? "1" : "2"}`);
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
            color = getBoardCol(`ghostWall${creatorToMove ? "2" : "1"}`);
          } else if (hoveredHere) {
            color = getBoardCol("hoveredWall");
          } else {
            color = getBoardCol("emptyWall");
          }
        } else color = getBoardCol("pillar");

        let [justifyContent, alignItems] = ["center", "center"];
        if (coordHere) {
          justifyContent = letterCoordHere ? "flex-start" : "flex-end";
          alignItems = letterCoordHere ? "flex-end" : "flex-start";
        }
        const style = {
          backgroundColor: color,
          display: "flex",
          justifyContent: justifyContent,
          alignItems: alignItems,
          borderTop: pos.r === 0 ? borderStyle : "",
          borderBottom: pos.r === dims.h - 1 ? borderStyle : "",
          borderLeft: pos.c === 0 ? borderStyle : "",
          borderRight: pos.c === dims.w - 1 ? borderStyle : "",
        };
        if (cellType !== "Pillar") style.cursor = "pointer";
        if (cellType === "Wall" && lastMoveHere)
          style.border = `${isDarkModeOn ? "1" : "2"}px solid ${getBoardCol(
            "lastMoveWallBorder"
          )}`;

        const lastMoveTextShadow = `0 0 4px ${getBoardCol(
          "lastMoveTokenBorder"
        )}`;

        return (
          <div
            className={className}
            key={`${pos.r}_${pos.c}`}
            onClick={() => {
              if (cellType !== "Pillar" && handleClick !== null)
                handleClick(pos);
            }}
            onMouseEnter={() => handleMouseEnter(pos)}
            onMouseLeave={handleMouseLeave}
            style={style}
          >
            {player1Here && (
              <i
                className={`material-icons`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: color1,
                  textShadow: lastMove1Here ? lastMoveTextShadow : "none",
                }}
              >
                {token1}
              </i>
            )}
            {player2Here && (
              <i
                className={`material-icons`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: color2,
                  textShadow: lastMove2Here ? lastMoveTextShadow : "none",
                }}
              >
                {token2}
              </i>
            )}
            {cellType === "Ground" && (shadow1Here || shadow2Here) && (
              <i
                className={`material-icons ${color1}-text text-lighten-4`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: getBoardCol(`ghost${shadow1Here ? "1" : "2"}`),
                }}
              >
                {shadow1Here ? token1 : token2}
              </i>
            )}
            {(goal1Here || goal2Here) && !playerHere && !shadowHere && (
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
