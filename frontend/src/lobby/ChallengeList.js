import React from "react";
import { Table } from "react-materialize";

import { prettyDate } from "../shared/utils";
import {
  timeControlToString,
  internalToClassicBoardSize,
  emptyBoardDistances,
} from "../shared/gameLogicUtils";
import { getColor } from "../shared/colorThemes";
import hoverHighlight from "../shared/hoverHighlight.module.css";

const boardDimsToString = (dims) => {
  return (
    internalToClassicBoardSize(dims[0]) +
    ":" +
    internalToClassicBoardSize(dims[1])
  );
};
const boardDistsToString = (dists) => {
  return dists[0] + " - " + dists[1];
};

const ChallengeList = ({
  challenges,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleAcceptChallenge,
}) => {
  const [col1, col2, colBg] = [
    getColor(menuTheme, "recentGamesBackground", isDarkModeOn),
    getColor(menuTheme, "recentGamesAlternate", isDarkModeOn),
    getColor(menuTheme, "container", isDarkModeOn),
  ];
  const headEntryStyle = {
    position: "sticky",
    top: "0px",
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    borderRadius: "0",
    backgroundColor: colBg,
  };
  const entryStyle = {
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    borderRadius: "0",
  };

  return (
    <div
      className={"center"}
      style={{
        overflowY: "scroll",
        display: "block",
        height: "100%",
        backgroundColor: col1,
      }}
    >
      <Table centered style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style={headEntryStyle}>Time</th>
            <th style={headEntryStyle}>Player</th>
            <th style={headEntryStyle}>Board</th>
            {isLargeScreen && <th style={headEntryStyle}>Distance</th>}
            <th style={headEntryStyle}>Date</th>
          </tr>
        </thead>
        <tbody>
          {challenges.map((game, i) => {
            return (
              <tr
                onClick={() => handleAcceptChallenge(game.joinCode)}
                style={{
                  cursor: "pointer",
                  backgroundColor: i % 2 ? col1 : col2,
                }}
                className={hoverHighlight.hoveredGame}
                key={i}
              >
                <td style={entryStyle}>
                  {timeControlToString(game.timeControl)}
                </td>
                <td style={entryStyle}>{game.playerNames[0]}</td>
                <td style={entryStyle}>
                  {boardDimsToString(game.boardSettings.dims)}
                </td>
                {isLargeScreen && (
                  <td style={entryStyle}>
                    {boardDistsToString(
                      emptyBoardDistances(game.boardSettings)
                    )}
                  </td>
                )}
                <td style={entryStyle}>
                  {prettyDate(game.creationDate, isLargeScreen)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default ChallengeList;
