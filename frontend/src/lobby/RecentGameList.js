import React from "react";
import { Table } from "react-materialize";
import cloneDeep from "lodash.clonedeep";

import globalSettings from "../shared/globalSettings";
import { cellTypeByPos, emptyGrid, distance } from "../shared/gameLogicUtils";
import { getColor } from "../shared/colorThemes";
import hoverHighlight from "../shared/hoverHighlight.module.css";

//duplicated from StatusHeader
const roundNum = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const timeControlToString = (timeControl) => {
  return roundNum(timeControl.duration) + "+" + roundNum(timeControl.increment);
};

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

  const grid = emptyGrid(globalSettings.boardDims);
  const playerPos = cloneDeep(globalSettings.initialPlayerPos);
  let idxToMove = serverGame.creatorStarts ? 0 : 1;
  for (let k = 0; k < serverGame.moveHistory.length; k++) {
    const actions = serverGame.moveHistory[k].actions;
    for (let k2 = 0; k2 < actions.length; k2++) {
      const pos = actions[k2];
      if (cellTypeByPos(pos) === "Ground") {
        playerPos[idxToMove] = pos;
      } else {
        grid[pos.r][pos.c] = idxToMove + 1;
      }
    }
    idxToMove = (idxToMove + 1) % 2;
  }
  const [g1, g2] = globalSettings.goals;
  const [d1, d2] = [
    distance(grid, playerPos[0], g1),
    distance(grid, playerPos[1], g2),
  ];
  cachedFinalDists.set(serverGame._id, [d1, d2]);
  return [d1, d2];
};

function prettyDate(date, longFormat) {
  if (!date) return "-";
  const curTime = new Date().getTime();
  const dateTime = new Date(date).getTime();
  const seconds = Math.floor((curTime - dateTime) / 1000);
  const secondsIn30Days = 30 * 24 * 60 * 60;
  const months = Math.floor(seconds / secondsIn30Days);
  if (months > 1) return months + (longFormat ? " months" : "mth") + " ago";
  if (months === 1) return "1" + (longFormat ? " month" : "mth") + " ago";
  const secondsInADay = 24 * 60 * 60;
  const days = Math.floor(seconds / secondsInADay);
  if (days > 1) return days + (longFormat ? " days" : "d") + " ago";
  if (days === 1) return "1" + (longFormat ? " day" : "d") + " ago";
  const hours = Math.floor(seconds / 3600);
  if (hours > 1) return hours + (longFormat ? " hours" : "h") + " ago";
  if (hours === 1) return "1" + (longFormat ? " hour" : "h") + " ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes > 1) return minutes + (longFormat ? " minutes" : "m") + " ago";
  if (minutes === 1) return "1" + (longFormat ? " minute" : "m") + " ago";
  return "Just now";
}

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
  const borderStyle = `1px solid ${getColor(
    menuTheme,
    "container",
    isDarkModeOn
  )}`;

  if (isLargeScreen) {
    return (
      <div
        className={"center"}
        style={{
          overflowY: "scroll",
          display: "block",
          height: "100%",
          border: borderStyle,
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
          border: borderStyle,
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
