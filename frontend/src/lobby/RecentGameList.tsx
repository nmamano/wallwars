// @ts-nocheck (necessary because of a problem with the <tr> tag)
import { Table } from "react-materialize";
import { TimeControl, timeControlToString } from "../shared/gameLogicUtils";
import { prettyDate } from "../shared/utils";
import { getColor, MenuThemeName } from "../shared/colorThemes";
import css from "../shared/hoverHighlight.module.css";

export type ServerGameSummary = {
  _id: string;
  ratings: [number, number];
  timeControl: TimeControl;
  winner: string;
  playerNames: [string, string];
  numMoves: number;
  startDate: Date;
};

export default function RecentGameList({
  recentGameSummaries,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleViewGame,
}: {
  recentGameSummaries: ServerGameSummary[];
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  handleViewGame: (gameId: string) => void;
}): JSX.Element {
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
  const boldEntryStyle = {
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    borderRadius: "0",
    fontWeight: "bold",
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
              <th style={headEntryStyle}>N</th>
              <th style={headEntryStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentGameSummaries &&
              recentGameSummaries.map((gameSummary, i) => {
                const [r1, r2] = [
                  Math.round(gameSummary.ratings[0]),
                  Math.round(gameSummary.ratings[1]),
                ];
                return (
                  <tr
                    onClick={() => handleViewGame(gameSummary._id)}
                    style={{
                      cursor: "pointer",
                      backgroundColor: i % 2 ? col1 : col2,
                    }}
                    className={css.hoveredGame}
                    key={i}
                  >
                    <td style={entryStyle}>
                      {timeControlToString(gameSummary.timeControl)}
                    </td>
                    <td
                      style={
                        gameSummary.winner === "creator"
                          ? boldEntryStyle
                          : entryStyle
                      }
                    >{`${gameSummary.playerNames[0]} (${r1})`}</td>
                    <td style={entryStyle}>{winnerToString(gameSummary)}</td>
                    <td
                      style={
                        gameSummary.winner === "joiner"
                          ? boldEntryStyle
                          : entryStyle
                      }
                    >{`${gameSummary.playerNames[1]} (${r2})`}</td>
                    <td style={entryStyle}>{gameSummary.numMoves}</td>
                    <td style={entryStyle}>
                      {prettyDate(gameSummary.startDate, true)}
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
            {recentGameSummaries &&
              recentGameSummaries.map((gameSummary, i) => {
                return (
                  <tr
                    onClick={() => handleViewGame(gameSummary._id)}
                    style={{
                      cursor: "pointer",
                      backgroundColor: i % 2 ? col1 : col2,
                    }}
                    className={css.hoveredGame}
                    key={i}
                  >
                    <td style={entryStyle}>
                      {timeControlToString(gameSummary.timeControl)}
                    </td>
                    <td style={entryStyle}>{gameSummary.playerNames[0]}</td>
                    <td style={entryStyle}>{winnerToString(gameSummary)}</td>
                    <td style={entryStyle}>{gameSummary.playerNames[1]}</td>
                    <td style={entryStyle}>
                      {prettyDate(gameSummary.startDate, false)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      </div>
    );
  }
}

function winnerToString(serverGame: ServerGameSummary): string {
  if (serverGame.winner === "creator") return "<";
  else if (serverGame.winner === "draw") return "=";
  else return ">";
}
