import React from "react";
import { Table } from "react-materialize";
import { getColor } from "../shared/colorThemes";
import hoverHighlight from "../shared/hoverHighlight.module.css";
import { puzzles } from "../game/puzzles";

const PuzzleList = ({ menuTheme, isDarkModeOn, handleSolvePuzzle }) => {
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
            <th style={headEntryStyle}>Puzzle</th>
            <th style={headEntryStyle}>Difficulty</th>
            <th style={headEntryStyle}>Author</th>
          </tr>
        </thead>
        <tbody>
          {puzzles.map((puzzle, i) => {
            return (
              <tr
                onClick={() => handleSolvePuzzle(puzzle)}
                style={{
                  cursor: "pointer",
                  backgroundColor: i % 2 ? col1 : col2,
                }}
                className={hoverHighlight.hoveredGame}
                key={i}
              >
                <td style={entryStyle}>{i + 1}</td>
                <td style={entryStyle}>{puzzle.difficulty}</td>
                <td style={entryStyle}>{puzzle.author}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default PuzzleList;
