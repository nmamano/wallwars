import { Table } from "react-materialize";
import { useMediaQuery } from "react-responsive";
import { CopyToClipboard } from "react-copy-to-clipboard";
import showToastNotification from "../shared/showToastNotification";
import {
  MoveHistory,
  MoveInHistory,
  moveNotation,
  getStandardNotation,
} from "../shared/gameLogicUtils";
import { ThemeName, getColor } from "../shared/colorThemes";
import css from "../shared/hoverHighlight.module.css";

const tdStyle = {
  paddingTop: "0.15rem",
  paddingBottom: "0.15rem",
  borderRadius: "0",
};

const tdStyleMonospace = {
  paddingTop: "0.15rem",
  paddingBottom: "0.15rem",
  borderRadius: "0",
  fontFamily: "monospace, monospace",
};

export default function MoveHistoryTable({
  moveHistory,
  creatorStarts,
  handleViewMove,
  viewIndex,
  height,
  menuTheme,
  boardTheme,
  isDarkModeOn,
}: {
  moveHistory: MoveHistory;
  creatorStarts: boolean;
  handleViewMove: (index: number) => void;
  viewIndex: number;
  height: number;
  menuTheme: ThemeName;
  boardTheme: ThemeName;
  isDarkModeOn: boolean;
}): JSX.Element {
  const canHover = !useMediaQuery({ query: "(hover: none)" });
  const [col1, col2, colBg, colSelected] = [
    getColor(boardTheme, "move1", isDarkModeOn),
    getColor(boardTheme, "move2", isDarkModeOn),
    getColor(menuTheme, "container", isDarkModeOn),
    getColor(boardTheme, "currentMove", isDarkModeOn),
  ];
  const headEntryStyle = {
    position: "sticky",
    top: "0px",
    paddingTop: "0.15rem",
    paddingBottom: "0.15rem",
    borderRadius: "0",
    backgroundColor: colBg,
  };

  return (
    <div
      id={"movehistory"}
      className={"center"}
      style={{
        overflowY: "scroll",
        display: "block",
        height: height,
        MozUserSelect: "none",
        WebkitUserSelect: "none",
        msUserSelect: "none",
        userSelect: "none",
      }}
    >
      <Table centered style={{ width: "100%" }}>
        <thead>
          <tr>
            {/*@ts-ignore*/}
            <th style={headEntryStyle}>#</th>
            {/*@ts-ignore*/}
            <th style={headEntryStyle}>
              <CopyToClipboard //@ts-ignore
                style={{ cursor: "pointer" }}
                text={getStandardNotation(moveHistory)}
                onCopy={() =>
                  showToastNotification("Game copied to clipboard!")
                }
              >
                <span>Moves</span>
              </CopyToClipboard>
            </th>
            {/*@ts-ignore*/}
            <th style={headEntryStyle}>Distance</th>
            {/*@ts-ignore*/}
            <th style={headEntryStyle}># Walls</th>
          </tr>
        </thead>
        <tbody>
          {moveHistory.map((move, i) => {
            let bgColor;
            if (viewIndex === i && i < moveHistory.length - 1) {
              bgColor = colSelected;
            } else if (i === 0) {
              bgColor = colBg;
            } else {
              const playerIdx = 1 + ((i + (creatorStarts ? 1 : 0)) % 2);
              bgColor = playerIdx === 1 ? col1 : col2;
            }
            return (
              <tr
                onClick={() => handleViewMove(i)}
                style={{
                  cursor: "pointer",
                  backgroundColor: bgColor,
                }}
                className={canHover ? css.hoveredMode : undefined}
                key={i}
              >
                <td style={tdStyle}>{i}</td>
                <td style={tdStyleMonospace}>{moveToString(move)}</td>
                <td style={tdStyle}>
                  {`${move.distances[0]} : ${move.distances[1]}`}
                </td>
                <td style={tdStyle}>
                  {`${move.wallCounts[0]} : ${move.wallCounts[1]}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}

function moveToString(move: MoveInHistory): string {
  if (move.index === 0) return "_______";
  return moveNotation(move.actions);
}
