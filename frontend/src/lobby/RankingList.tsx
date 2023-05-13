// @ts-nocheck (necessary because of a problem with the <tr> tag)
import { useEffect } from "react";
import { useImmer } from "use-immer";
import { prettyDate } from "../shared/utils";
import { getColor, MenuThemeName } from "../shared/colorThemes";
import css from "../shared/hoverHighlight.module.css";
import socket from "../socket";

export type PseudoPlayer = {
  name: string;
  winCount: number;
  drawCount: number;
  gameCount: number;
  rating: number;
  peakRating: number;
  firstGameDate: Date;
  lastGameDate: Date;
};

export type Ranking = PseudoPlayer[];

export default function RankingList({
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
}: {
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
}): JSX.Element {
  const [state, updateState] = useImmer<{
    needToRequestRanking: boolean;
    ranking: Ranking;
  }>({
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
  }, [updateState, state.needToRequestRanking]);
  useEffect(() => {
    socket.once("requestedRanking", ({ ranking }: { ranking: Ranking }) => {
      updateState((draftState) => {
        draftState.ranking = ranking;
      });
    });
  }, [updateState]);

  const [col1, col2, colBg] = [
    getColor(menuTheme, "recentGamesBackground", isDarkModeOn),
    getColor(menuTheme, "recentGamesAlternate", isDarkModeOn),
    getColor(menuTheme, "container", isDarkModeOn),
  ];
  const headEntryStyle = {
    textAlign: "center",
    position: "sticky",
    top: "0px",
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    borderRadius: "0",
    backgroundColor: colBg,
  };
  const entryStyle = {
    textAlign: "center",
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
        <table style={{ width: "100%" }}>
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
                    className={css.hoveredGame}
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
        </table>
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
        <table style={{ width: "100%" }}>
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
                    className={css.hoveredGame}
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
        </table>
      </div>
    );
  }
}

function GamesToString(pseudoPlayer: PseudoPlayer): string {
  const w = pseudoPlayer.winCount;
  const d = pseudoPlayer.drawCount;
  const l = pseudoPlayer.gameCount - w - d;
  return w + "/" + d + "/" + l;
}
