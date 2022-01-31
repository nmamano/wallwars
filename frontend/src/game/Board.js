import React, { useState } from "react";
import { useMediaQuery } from "react-responsive";

import {
  cellEnum,
  cellTypeByPos,
  posEq,
  rowNotation,
  columnNotation,
} from "../shared/gameLogicUtils";
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

  // cell highlighting
  const [highlightedCells, setHighlightedCells] = useState([]);
  const handleClickOrHighlight = (pos, event) => {
    //normal move
    if (!event.ctrlKey && !event.metaKey) {
      handleClick(pos);
      return;
    }

    // Highlight cells if control is pressed.
    let pos_index = -1;
    for (let i = 0; i < highlightedCells.length; ++i) {
      if (posEq(pos, highlightedCells[i])) {
        pos_index = i;
        break;
      }
    }
    if (pos_index === -1) {
      const newHighlightedCells = [...highlightedCells];
      newHighlightedCells.push(pos);
      setHighlightedCells(newHighlightedCells);
    } else {
      const newHighlightedCells = [];
      for (let i = 0; i < highlightedCells.length; ++i) {
        if (i !== pos_index) newHighlightedCells.push(highlightedCells[i]);
      }
      setHighlightedCells(newHighlightedCells);
    }
  };

  //short-hand for getColor
  const getCol = (elem) => getColor(boardTheme, elem, isDarkModeOn);

  const borderStyle = `1px solid ${getColor(
    menuTheme,
    "container",
    isDarkModeOn
  )}`;
  const [color1, color2] = [getCol("player1"), getCol("player2")];

  const defaultTokens = ["face", "outlet"];
  let [token1, token2] = tokens;
  if (token1 === "default") token1 = defaultTokens[0];
  if (token2 === "default") token2 = defaultTokens[1];

  const dims = [grid.length, grid[0].length];
  const allPos = [];
  for (let r = 0; r < dims[0]; r++)
    for (let c = 0; c < dims[1]; c++) allPos[r * dims[1] + c] = [r, c];

  const [repRows, repCols] = [(dims[0] - 1) / 2, (dims[1] - 1) / 2];

  const tokenSize = 0.8 * groundSize;
  const coordColor = getCol("coord");

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
        alignSelf: "center",
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

        let highlightHere = false;
        for (let i = 0; i < highlightedCells.length; ++i) {
          if (posEq(pos, highlightedCells[i])) {
            highlightHere = true;
            break;
          }
        }

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
          coordFits && pos[0] === dims[0] - 1 && pos[1] % 2 === 0;
        const numberCoordHere =
          coordFits && pos[1] === dims[1] - 1 && pos[0] % 2 === 0;
        const coordHere = letterCoordHere || numberCoordHere;

        const hoveredHere = canHover && hoveredCell && posEq(pos, hoveredCell);

        //add waves cosmetic effect when clicking a cell
        const cellType = cellTypeByPos(pos);
        let className = "";
        if (cellType === cellEnum.ground)
          className += "waves-effect waves-light";
        if (cellType === cellEnum.wall) className += "waves-effect waves-dark";

        let color;
        if (cellType === cellEnum.ground) {
          if (hoveredHere) {
            color = getCol("hoveredGround");
          } else if (highlightHere) {
            color = getCol("highlightedGround");
          } else if (traceHere) {
            color = getCol("traceGround");
          } else if (goalHere) {
            if (goal1Here && goal2Here)
              color = getCol("combinedGoalBackground");
            else color = getCol(`goalBackground${goal1Here ? "1" : "2"}`);
          } else {
            color = getCol("ground");
          }
        } else if (cellType === cellEnum.wall) {
          const solidWallHere = grid[pos[0]][pos[1]] !== 0;
          if (solidWallHere) {
            color = getCol(`wall${grid[pos[0]][pos[1]]}`);
          } else if (ghostHere) {
            color = getCol(`ghostWall${creatorToMove ? "1" : "2"}`);
          } else if (premoveHere) {
            color = getCol(`ghostWall${creatorToMove ? "2" : "1"}`);
          } else if (hoveredHere) {
            color = getCol("hoveredWall");
          } else if (highlightHere) {
            color = getCol("highlightedWall");
          } else {
            color = getCol("emptyWall");
          }
        } else color = getCol("pillar");

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
          position: "relative",
        };
        if (cellType !== cellEnum.pillar) style.cursor = "pointer";
        if (cellType === cellEnum.wall && lastMoveHere) {
          style.border = `${isDarkModeOn ? "1" : "2"}px solid ${getCol(
            "lastMoveWallBorder"
          )}`;
        } else {
          if (pos[0] === 0) style.borderTop = borderStyle;
          if (pos[0] === dims[0] - 1) style.borderBottom = borderStyle;
          if (pos[1] === 0) style.borderLeft = borderStyle;
          if (pos[1] === dims[1] - 1) style.borderRight = borderStyle;
        }

        const lastMoveTextShadow = `0 0 4px ${getCol("lastMoveTokenBorder")}`;

        //To mitigate misclicks, we make it so that if you click a ground
        //cell very close to a wall (within the closest 5%), nothing happens.
        //we don't do the same for walls because walls are already narrow,
        //so we don't want to make them harder to click
        const clickableGroundStyle = {
          position: "absolute",
          height: "90%",
          width: "90%",
          top: "5%",
          left: "5%",
          cursor: "pointer",
        };
        if (pos[0] === 0 || pos[0] === dims[0] - 1) {
          clickableGroundStyle.height = "95%";
          if (pos[0] === 0) clickableGroundStyle.top = "0";
          else clickableGroundStyle.top = "5%";
        }
        if (pos[1] === 0 || pos[1] === dims[1] - 1) {
          clickableGroundStyle.width = "95%";
          if (pos[1] === 0) clickableGroundStyle.left = "0";
          else clickableGroundStyle.left = "5%";
        }

        return (
          <div
            className={className}
            key={`${pos[0]}_${pos[1]}`}
            onMouseEnter={() => handleMouseEnter(pos)}
            onMouseLeave={handleMouseLeave}
            style={style}
            onClick={
              cellType === cellEnum.wall && handleClick !== null
                ? (event) => {
                    handleClickOrHighlight(pos, event);
                  }
                : undefined
            }
          >
            {cellType === cellEnum.ground && (
              <div
                style={clickableGroundStyle}
                onClick={
                  handleClick !== null
                    ? (event) => {
                        handleClickOrHighlight(pos, event);
                      }
                    : undefined
                }
              ></div>
            )}
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
            {cellType === cellEnum.ground && (shadow1Here || shadow2Here) && (
              <i
                className={`material-icons ${color1}-text text-lighten-4`}
                style={{
                  fontSize: `${tokenSize}px`,
                  color: getCol(`ghost${shadow1Here ? "1" : "2"}`),
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
                  color: getCol("goalToken"),
                }}
              >
                {goal1Here && token1}
                {goal2Here && token2}
              </i>
            )}
            {letterCoordHere && (
              <div
                style={{ color: coordColor, padding: "0", marginLeft: "4px" }}
              >
                {columnNotation(pos)}
              </div>
            )}
            {numberCoordHere && !letterCoordHere && (
              <div
                style={{ color: coordColor, padding: "0", marginRight: "4px" }}
              >
                {rowNotation(pos)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Board;
