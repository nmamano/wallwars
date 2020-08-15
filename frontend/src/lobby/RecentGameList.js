import React, { useState, useEffect } from "react";
import { Table } from "react-materialize";
import cloneDeep from "lodash.clonedeep";

import globalSettings from "../shared/globalSettings";
import { cellTypeByPos, emptyGrid, distance } from "../gameLogic/mainLogic";

//duplicated from MoveHistory
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
const finalDistsToString = (serverGame) => {
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
  return d1 + " - " + d2;
};

function prettyDate(date, longFormat) {
  if (!date) return "-";
  const curTime = new Date().getTime();
  const dateTime = new Date(date).getTime();
  const seconds = Math.floor((curTime - dateTime) / 1000);

  let interval = Math.floor(seconds / 2592000);
  if (interval > 1) return date.toDateString.substring(4, 10);

  interval = Math.floor(seconds / 86400);
  if (interval === 1) return longFormat ? "1 day ago" : "1d ago";
  if (interval > 1) return interval + (longFormat ? " days" : "d") + " ago";

  interval = Math.floor(seconds / 3600);
  if (interval === 1) return longFormat ? "1 hour ago" : "1h ago";
  if (interval > 1) return interval + (longFormat ? " hours" : "h") + " ago";

  interval = Math.floor(seconds / 60);
  if (interval === 1) return longFormat ? "1 minute ago" : "1m ago";
  if (interval > 1) return interval + (longFormat ? " minutes" : "m") + " ago";

  return "Just now";
}

const RecentGameList = ({
  socket,
  isLargeScreen,
  isDarkModeOn,
  handleViewGame,
}) => {
  const [recentGames, setRecentGames] = useState([]);
  const [needToRequestGames, setNeedToRequestGames] = useState(true);

  useEffect(() => {
    if (!needToRequestGames) return;
    setNeedToRequestGames(false);
    socket.emit("getRecentGames");
  }, [socket, needToRequestGames]);

  useEffect(() => {
    socket.on("requestedRecentGames", ({ games }) => {
      setRecentGames(games);
    });
  }, [socket, needToRequestGames]);

  if (isLargeScreen) {
    return (
      <div
        className={"center"}
        style={{
          overflowY: "scroll",
          display: "block",
          height: "100%",
          border: "1px solid #00796d",
          backgroundColor: isDarkModeOn ? "#d32f2f" : "#e57373",
        }}
      >
        <Table centered style={{ width: "100%" }}>
          <thead>
            <tr>
              <th className={thClassName} style={thStyle}>
                Time
              </th>
              <th className={thClassName} style={thStyle}>
                Player 1
              </th>
              <th className={thClassName} style={thStyle}></th>
              <th className={thClassName} style={thStyle}>
                Player 2
              </th>
              <th className={thClassName} style={thStyle}>
                Distance
              </th>
              <th className={thClassName} style={thStyle}>
                Turns
              </th>
              <th className={thClassName} style={thStyle}>
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {recentGames &&
              recentGames.map((game, i) => {
                let color = "red";
                color += isDarkModeOn ? " darken-" : " lighten-";
                color += 1 + (i % 2);

                return (
                  <tr
                    onClick={() => handleViewGame(game._id)}
                    style={{
                      cursor: "pointer",
                    }}
                    key={i}
                    className={color}
                  >
                    <td style={tdStyle}>
                      {timeControlToString(game.timeControl)}
                    </td>
                    <td style={tdStyle}>{game.playerNames[0]}</td>
                    <td style={tdStyle}>{winnerToString(game)}</td>
                    <td style={tdStyle}>{game.playerNames[1]}</td>
                    <td style={tdStyle}>{finalDistsToString(game)}</td>
                    <td style={tdStyle}>{game.moveHistory.length}</td>
                    <td style={tdStyle}>{prettyDate(game.startDate, true)}</td>
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
          border: "1px solid #00796d",
        }}
      >
        <Table centered style={{ width: "100%" }}>
          <thead>
            <tr>
              <th className={thClassName} style={thStyle}>
                Time
              </th>
              <th className={thClassName} style={thStyle}>
                Player 1
              </th>
              <th className={thClassName} style={thStyle}>
                Win
              </th>
              <th className={thClassName} style={thStyle}>
                Player 2
              </th>
              <th className={thClassName} style={thStyle}>
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {recentGames &&
              recentGames.map((game, i) => {
                let color = "red";
                color += isDarkModeOn ? " darken-" : " lighten-";
                color += 1 + (i % 2);

                return (
                  <tr
                    onClick={() => handleViewGame(game._id)}
                    style={{
                      cursor: "pointer",
                    }}
                    key={i}
                    className={color}
                  >
                    <td style={tdStyle}>
                      {timeControlToString(game.timeControl)}
                    </td>
                    <td style={tdStyle}>{game.playerNames[0]}</td>
                    <td style={tdStyle}>{winnerToString(game)}</td>
                    <td style={tdStyle}>{game.playerNames[1]}</td>
                    <td style={tdStyle}>{prettyDate(game.startDate, false)}</td>
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
