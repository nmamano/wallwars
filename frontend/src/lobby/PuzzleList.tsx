// @ts-nocheck (necessary because of a problem with the <tr> tag)
import { useEffect } from "react";
import { useImmer } from "use-immer";
import { getColor, MenuThemeName } from "../shared/colorThemes";
import css from "../shared/hoverHighlight.module.css";
import { puzzles } from "../game/puzzles";
import socket from "../socket";

export default function PuzzleList({
  name,
  isLoggedIn,
  menuTheme,
  isDarkModeOn,
  handleSolvePuzzle,
}: {
  name: string;
  isLoggedIn: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  handleSolvePuzzle: (puzzleId: string) => void;
}): JSX.Element {
  const [state, updateState] = useImmer<{
    needToRequestSolvedPuzzles: boolean;
    solvedPuzzles: string[];
  }>({
    needToRequestSolvedPuzzles: true,
    solvedPuzzles: [],
  });

  // Indicate that we need to request solved puzzles on name change. This is
  // because we want to request the list of solved puzzles when the user logs
  // in, and their name changes, when they login.
  useEffect(() => {
    updateState((draftState) => {
      draftState.needToRequestSolvedPuzzles = true;
    });
  }, [name, updateState]);

  useEffect(() => {
    if (state.needToRequestSolvedPuzzles) {
      updateState((draftState) => {
        draftState.needToRequestSolvedPuzzles = false;
      });
      if (isLoggedIn) {
        socket.emit("getSolvedPuzzles");
      }
    }
  }, [isLoggedIn, updateState, state.needToRequestSolvedPuzzles]);

  useEffect(() => {
    socket.once(
      "requestedSolvedPuzzles",
      ({ solvedPuzzles }: { solvedPuzzles: string[] }) => {
        updateState((draftState) => {
          draftState.solvedPuzzles = solvedPuzzles;
        });
      }
    );
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
            <th style={headEntryStyle}>Puzzle</th>
            <th style={headEntryStyle}>Rating</th>
            <th style={headEntryStyle}>Author</th>
            {/* Guests can solve the puzzles, but they don't see the mark of
            whether they have already solved it, since that's a feature for
            logged-in users. */}
            {isLoggedIn && <th style={headEntryStyle}>Solved</th>}
          </tr>
        </thead>
        <tbody>
          {puzzles.map((puzzle, i) => {
            return (
              <tr
                onClick={() => handleSolvePuzzle(puzzle.id)}
                style={{
                  cursor: "pointer",
                  backgroundColor: i % 2 ? col1 : col2,
                }}
                className={css.hoveredGame}
                key={i}
              >
                <td style={entryStyle}>{puzzle.id}</td>
                <td style={entryStyle}>{puzzle.difficulty}</td>
                <td style={entryStyle}>{puzzle.author}</td>
                {isLoggedIn && (
                  <td style={entryStyle}>
                    {state.solvedPuzzles.includes(puzzle.id) ? "Yes" : "No"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
