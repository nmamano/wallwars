import React, { useEffect } from "react";
import { useImmer } from "use-immer";
import { Table } from "react-materialize";
import { prettyDate } from "../shared/utils";
import { getColor } from "../shared/colorThemes";
import hoverHighlight from "../shared/hoverHighlight.module.css";

const GamesToString = (pseudoPlayer) => {
  const w = pseudoPlayer.winCount;
  const d = pseudoPlayer.drawCount;
  const l = pseudoPlayer.gameCount - w - d;
  return w + "/" + d + "/" + l;
};

const RankingList = ({ socket, isLargeScreen, menuTheme, isDarkModeOn }) => {
  const [state, updateState] = useImmer({
    needToRequestRanking: true,
    ranking: [],
  });
  useEffect(() => {
    if (state.needToRequestRanking) {
      updateState((draftState) => {
        draftState.needToRequestRanking = false;
      });
      socket.emit("getRanking", {
        count: 200,
      });
    }
  }, [socket, updateState, state.needToRequestRanking]);
  useEffect(() => {
    socket.once("requestedRanking", ({ ranking }) => {
      updateState((draftState) => {
        draftState.ranking = ranking;
      });
    });
  }, [socket, updateState]);

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
              <th style={headEntryStyle}>Rank</th>
              <th style={headEntryStyle}>Name</th>
              <th style={headEntryStyle}>Rating</th>
              <th style={headEntryStyle}>Peak</th>
              <th style={headEntryStyle}>W/D/L</th>
              <th style={headEntryStyle}>First Played</th>
              <th style={headEntryStyle}>Last Played</th>
            </tr>
          </thead>
          <tbody>
            {state.ranking &&
              state.ranking.map((pseudoPlayer, i) => {
                return (
                  <tr
                    style={{
                      backgroundColor: i % 2 ? col1 : col2,
                    }}
                    className={hoverHighlight.hoveredGame}
                    key={i}
                  >
                    <td style={entryStyle}>{i + 1}</td>
                    <td style={entryStyle}>{pseudoPlayer.name}</td>
                    <td style={entryStyle}>
                      {Math.round(pseudoPlayer.rating)}
                    </td>
                    <td style={entryStyle}>
                      {Math.round(pseudoPlayer.peakRating)}
                    </td>
                    <td style={entryStyle}>{GamesToString(pseudoPlayer)}</td>
                    <td style={entryStyle}>
                      {prettyDate(pseudoPlayer.firstGameDate, true)}
                    </td>
                    <td style={entryStyle}>
                      {prettyDate(pseudoPlayer.lastGameDate, true)}
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
              <th style={headEntryStyle}>Rank</th>
              <th style={headEntryStyle}>Name</th>
              <th style={headEntryStyle}>Rating</th>
              <th style={headEntryStyle}>W/D/L</th>
              <th style={headEntryStyle}>Last Game</th>
            </tr>
          </thead>
          <tbody>
            {state.ranking &&
              state.ranking.map((pseudoPlayer, i) => {
                return (
                  <tr
                    style={{
                      backgroundColor: i % 2 ? col1 : col2,
                    }}
                    className={hoverHighlight.hoveredGame}
                    key={i}
                  >
                    <td style={entryStyle}>{i + 1}</td>
                    <td style={entryStyle}>{pseudoPlayer.name}</td>
                    <td style={entryStyle}>
                      {Math.round(pseudoPlayer.rating)}
                    </td>
                    <td style={entryStyle}>{GamesToString(pseudoPlayer)}</td>
                    <td style={entryStyle}>
                      {prettyDate(pseudoPlayer.lastGameDate, false)}
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

export default RankingList;
