import React, { useState, useEffect } from "react";
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

const MoveHistory = ({
  moveHistory,
  playerColors,
  creatorStarts,
  tableHeight,
  handleViewMove,
  viewIndex,
}) => {
  const [scroll, setScroll] = useState(null);

  useEffect(() => {
    return () => {
      if (scroll) scroll.scrollIntoView();
    };
  });
  return (
    <div
      className={"center"}
      style={{
        overflowY: "scroll",
        display: "block",
        height: tableHeight,
        marginLeft: "3rem",
      }}
    >
      <Table centered style={{ width: "100%" }}>
        <thead>
          <tr>
            <th
              className={"teal darken-2"}
              style={{ position: "sticky", top: "0px" }}
            >
              Move
            </th>
            <th
              className={"teal darken-2"}
              style={{ position: "sticky", top: "0px" }}
            >
              Actions
            </th>
            <th
              className={"teal darken-2"}
              style={{ position: "sticky", top: "0px" }}
            >
              Distance
            </th>
            <th
              className={"teal darken-2"}
              style={{ position: "sticky", top: "0px" }}
            >
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
            const isLast = i === moveHistory.length - 1;
            return (
              <tr
                onClick={() => handleViewMove(i)}
                style={{
                  cursor: "pointer",
                }}
                key={i}
                className={color}
                ref={(e) => {
                  if (isLast) setScroll(e);
                }}
              >
                <td
                  style={{
                    paddingTop: "0.15rem",
                    paddingBottom: "0.15rem",
                    borderRadius: "0",
                  }}
                >
                  {i}
                </td>
                <td
                  style={{
                    paddingTop: "0",
                    paddingBottom: "0",
                    borderRadius: "0",
                  }}
                >
                  {moveToString(move)}
                </td>
                <td
                  style={{
                    paddingTop: "0",
                    paddingBottom: "0",
                    borderRadius: "0",
                  }}
                >
                  {move.distances[0] + " - " + move.distances[1]}
                </td>
                <td
                  style={{
                    paddingTop: "0",
                    paddingBottom: "0",
                    borderRadius: "0",
                  }}
                >
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
