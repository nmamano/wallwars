import React from "react";
import { Table } from "react-materialize";
import cloneDeep from "lodash.clonedeep";

import {
  cellTypeByPos,
  emptyGrid,
  distance,
  timeControlToString,
  cellEnum,
} from "../shared/gameLogicUtils";
import { prettyDate } from "../shared/utils";
import { getColor } from "../shared/colorThemes";
import hoverHighlight from "../shared/hoverHighlight.module.css";

const winnerToString = (serverGame) => {
  if (serverGame.winner === "creator") return "<";
  else if (serverGame.winner === "draw") return "=";
  else return ">";
};

const cachedFinalDists = new Map();
const finalDists = (serverGame) => {
  //limit the size so old games don't accrue indefinitely
  if (cachedFinalDists.size > 1000) cachedFinalDists.clear();
  if (cachedFinalDists.has(serverGame._id))
    return cachedFinalDists.get(serverGame._id);

  const grid = emptyGrid(serverGame.boardSettings.dims);
  const playerPos = cloneDeep(serverGame.boardSettings.startPos);
  let idxToMove = serverGame.creatorStarts ? 0 : 1;
  for (let k = 0; k < serverGame.moveHistory.length; k++) {
    const actions = serverGame.moveHistory[k].actions;
    for (let k2 = 0; k2 < actions.length; k2++) {
      const pos = actions[k2];
      if (cellTypeByPos(pos) === cellEnum.ground) {
        playerPos[idxToMove] = pos;
      } else {
        grid[pos[0]][pos[1]] = idxToMove + 1;
      }
    }
    idxToMove = (idxToMove + 1) % 2;
  }
  const [g1, g2] = serverGame.boardSettings.goalPos;
  const [d1, d2] = [
    distance(grid, playerPos[0], g1),
    distance(grid, playerPos[1], g2),
  ];
  cachedFinalDists.set(serverGame._id, [d1, d2]);
  return [d1, d2];
};

const RecentGameList = ({
  recentGames,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleViewGame,
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
  if (isLargeScreen) {
    return (
      <div
        className={"center"}
        style={{
          overflowY: "scroll",
          display: "block",
          height: "100%",
          backgroundColor: getColor(
            menuTheme,
            "recentGamesBackground",
            isDarkModeOn
          ),
        }}
      >
        <Table centered style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={headEntryStyle}>Time</th>
              <th style={headEntryStyle}>Player 1</th>
              <th style={headEntryStyle}></th>
              <th style={headEntryStyle}>Player 2</th>
              <th style={headEntryStyle}>Distance</th>
              <th style={headEntryStyle}>Turns</th>
              <th style={headEntryStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentGames &&
              recentGames.map((game, i) => {
                const [d1, d2] = finalDists(game);
                return (
                  <tr
                    onClick={() => handleViewGame(game._id)}
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
                    <td style={entryStyle}>{winnerToString(game)}</td>
                    <td style={entryStyle}>{game.playerNames[1]}</td>
                    <td style={entryStyle}>{d1 + " - " + d2}</td>
                    <td style={entryStyle}>{game.moveHistory.length}</td>
                    <td style={entryStyle}>
                      {prettyDate(game.startDate, true)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>
    );
  } else {
    return (
      <div
        className={"center"}
        style={{
          overflowY: "scroll",
          display: "block",
          height: "100%",
        }}
      >
        <Table centered style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={headEntryStyle}>Time</th>
              <th style={headEntryStyle}>Player 1</th>
              <th style={headEntryStyle}>Win</th>
              <th style={headEntryStyle}>Player 2</th>
              <th style={headEntryStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentGames &&
              recentGames.map((game, i) => {
                return (
                  <tr
                    onClick={() => handleViewGame(game._id)}
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
                    <td style={entryStyle}>{winnerToString(game)}</td>
                    <td style={entryStyle}>{game.playerNames[1]}</td>
                    <td style={entryStyle}>
                      {prettyDate(game.startDate, false)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>
    );
  }
};

export default RecentGameList;
