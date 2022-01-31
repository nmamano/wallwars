import React from "react";
import { Table } from "react-materialize";
import { useMediaQuery } from "react-responsive";

import { moveNotation } from "../shared/gameLogicUtils";
import { getColor } from "../shared/colorThemes";
import hoverHighlight from "../shared/hoverHighlight.module.css";

const moveToString = (move) => {
  if (move.index === 0) return "_______";
  return moveNotation(move.actions);
};

const tdStyle = {
  paddingTop: "0.15rem",
  paddingBottom: "0.15rem",
  borderRadius: "0",
};

const tdStyleMonospace = {
  paddingTop: "0.15rem",
  paddingBottom: "0.15rem",
  borderRadius: "0",
  fontFamily: "monospace, monospace",
};

const MoveHistory = ({
  moveHistory,
  creatorStarts,
  handleViewMove,
  viewIndex,
  height,
  menuTheme,
  boardTheme,
  isDarkModeOn,
}) => {
  const canHover = !useMediaQuery({ query: "(hover: none)" });
  const [col1, col2, colBg, colSelected] = [
    getColor(boardTheme, "move1", isDarkModeOn),
    getColor(boardTheme, "move2", isDarkModeOn),
    getColor(menuTheme, "container", isDarkModeOn),
    getColor(boardTheme, "currentMove", isDarkModeOn),
  ];
  const headEntryStyle = {
    position: "sticky",
    top: "0px",
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    borderRadius: "0",
    backgroundColor: colBg,
  };

  return (
    <div
      id={"movehistory"}
      className={"center"}
      style={{
        overflowY: "scroll",
        display: "block",
        height: height,
        MozUserSelect: "none",
        WebkitUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    >
      <Table centered style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style={headEntryStyle}>#</th>
            <th style={headEntryStyle}>Move</th>
            <th style={headEntryStyle}>Distance</th>
            <th style={headEntryStyle}># Walls</th>
          </tr>
        </thead>
        <tbody>
          {moveHistory.map((move, i) => {
            let bgColor;
            if (viewIndex === i && i < moveHistory.length - 1) {
              bgColor = colSelected;
            } else if (i === 0) {
              bgColor = colBg;
            } else {
              const playerIdx = 1 + ((i + (creatorStarts ? 1 : 0)) % 2);
              bgColor = playerIdx === 1 ? col1 : col2;
            }
            return (
              <tr
                onClick={() => handleViewMove(i)}
                style={{
                  cursor: "pointer",
                  backgroundColor: bgColor,
                }}
                className={canHover ? hoverHighlight.hoveredMode : undefined}
                key={i}
              >
                <td style={tdStyle}>{i}</td>
                <td style={tdStyleMonospace}>{moveToString(move)}</td>
                <td style={tdStyle}>
                  {`${move.distances[0]} : ${move.distances[1]}`}
                </td>
                <td style={tdStyle}>
                  {`${move.wallCounts[0]} : ${move.wallCounts[1]}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default MoveHistory;
