// @ts-nocheck (necessary because of a problem with the table tags)
import { prettyDate } from "../shared/utils";
import {
  timeControlToString,
  internalToClassicBoardSize,
  emptyBoardDistances,
  BoardDims,
} from "../shared/gameLogicUtils";
import { getColor, MenuThemeName } from "../shared/colorThemes";
import css from "../shared/hoverHighlight.module.css";
import { Challenge } from "./LobbyTabs";

export default function ChallengeList({
  challenges,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleAcceptChallenge,
}: {
  challenges: Challenge[];
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  handleAcceptChallenge: (challengeId: string) => void;
}): JSX.Element {
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
      <table style={{ width: "100%" }}>
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
                className={css.hoveredGame}
                key={i}
              >
                <td style={entryStyle}>
                  {(game.isRated ? "*" : "") +
                    timeControlToString(game.timeControl)}
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
      </table>
    </div>
  );
}

function boardDimsToString(dims: BoardDims): string {
  return (
    internalToClassicBoardSize(dims[0]) +
    ":" +
    internalToClassicBoardSize(dims[1])
  );
}

function boardDistsToString(dists: [number, number]): string {
  return dists[0] + " - " + dists[1];
}
