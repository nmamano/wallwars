import React from "react";
import { Table } from "react-materialize";

import { cellTypeByPos } from "../gameLogic/mainLogic";

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

const thClassName = "teal darken-2";
const thStyle = {
  position: "sticky",
  top: "0px",
  paddingTop: "0.15rem",
  paddingBottom: "0.15rem",
  borderRadius: "0",
};
const tdStyle = {
  paddingTop: "0.15rem",
  paddingBottom: "0.15rem",
  borderRadius: "0",
};

const MoveHistory = ({
  moveHistory,
  playerColors,
  creatorStarts,
  handleViewMove,
  viewIndex,
  height,
}) => {
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
            <th className={thClassName} style={thStyle}>
              Move
            </th>
            <th className={thClassName} style={thStyle}>
              Actions
            </th>
            <th className={thClassName} style={thStyle}>
              Distance
            </th>
            <th className={thClassName} style={thStyle}>
              # Walls
            </th>
          </tr>
        </thead>
        <tbody>
          {moveHistory.map((move, i) => {
            let color;
            if (i === 0) color = undefined;
            else {
              if (creatorStarts) color = playerColors[(i + 1) % 2];
              else color = playerColors[i % 2];
              color += " lighten-2";
            }
            if (viewIndex === i && i < moveHistory.length - 1)
              color = "amber darken-1";
            return (
              <tr
                onClick={() => handleViewMove(i)}
                style={{
                  cursor: "pointer",
                }}
                key={i}
                className={color}
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
