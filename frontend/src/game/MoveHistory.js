import React from "react";
import { Table } from "react-materialize";

import { cellTypeByPos } from "../shared/gameLogicUtils";
import { getColor } from "../shared/colorThemes";

const moveToString = (move) => {
  if (move.index === 0) return "__";
  let wallCount = 0;
  for (let k = 0; k < move.actions.length; k++) {
    const aPos = move.actions[k];
    const aType = cellTypeByPos(aPos);
    if (aType === "Wall") wallCount += 1;
  }
  if (wallCount === 0) return "GG";
  else if (wallCount === 1) return "GW";
  return "WW";
};

const tdStyle = {
  paddingTop: "0.15rem",
  paddingBottom: "0.15rem",
  borderRadius: "0",
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
  const thStyle = {
    position: "sticky",
    top: "0px",
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    borderRadius: "0",
    backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
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
            <th style={thStyle}>Move</th>
            <th style={thStyle}>Actions</th>
            <th style={thStyle}>Distance</th>
            <th style={thStyle}># Walls</th>
          </tr>
        </thead>
        <tbody>
          {moveHistory.map((move, i) => {
            let bgColor;
            if (i === 0) {
              bgColor = getColor(menuTheme, `container`, isDarkModeOn);
            } else if (viewIndex === i && i < moveHistory.length - 1) {
              bgColor = getColor(boardTheme, `currentMove`, isDarkModeOn);
            } else {
              const playerIdx = 1 + ((i + (creatorStarts ? 1 : 0)) % 2);
              bgColor = getColor(boardTheme, `move${playerIdx}`, isDarkModeOn);
            }
            return (
              <tr
                onClick={() => handleViewMove(i)}
                style={{
                  cursor: "pointer",
                  backgroundColor: bgColor,
                }}
                key={i}
              >
                <td style={tdStyle}>{i}</td>
                <td style={tdStyle}>{moveToString(move)}</td>
                <td style={tdStyle}>
                  {move.distances[0] + " - " + move.distances[1]}
                </td>
                <td style={tdStyle}>
                  {move.wallCounts[0] + " - " + move.wallCounts[1]}
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
