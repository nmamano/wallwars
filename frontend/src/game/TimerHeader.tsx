import { getColor, MenuThemeName, BoardThemeName } from "../shared/colorThemes";
import { LifeCycleStage } from "./gameState";
import { RoleEnum } from "./gameState";

export default function TimerHeader({
  clientRole,
  lifeCycleStage,
  names,
  ratings,
  timeLeft,
  indexToMove,
  isLargeScreen,
  scores,
  arePlayersPresent,
  menuTheme,
  boardTheme,
  isDarkModeOn,
}: {
  clientRole: RoleEnum;
  lifeCycleStage: LifeCycleStage;
  names: [string, string];
  ratings: [number, number];
  timeLeft: [number, number];
  indexToMove: number;
  isLargeScreen: boolean;
  scores: [number, number];
  arePlayersPresent: [boolean, boolean];
  menuTheme: MenuThemeName;
  boardTheme: BoardThemeName;
  isDarkModeOn: boolean;
}): JSX.Element {
  const [min1, min2] = [
    Math.floor(timeLeft[0] / 60),
    Math.floor(timeLeft[1] / 60),
  ];
  const [sec1, sec2] = [timeLeft[0] % 60, timeLeft[1] % 60];
  const timesAsStrings = [
    `${min1}:${sec1 < 10 ? "0" : ""}${sec1}`,
    `${min2}:${sec2 < 10 ? "0" : ""}${sec2}`,
  ];
  if (lifeCycleStage < 0) {
    timesAsStrings[0] = "_:__";
    timesAsStrings[1] = "_:__";
  }
  let pToMove = [false, false];
  if (lifeCycleStage < 4) pToMove[indexToMove] = true;

  let isLowOnTime = [false, false];
  const lowTimeLimit = 15;
  if (lifeCycleStage === 3) {
    if (indexToMove === 0) {
      if (timeLeft[0] < lowTimeLimit) isLowOnTime[0] = true;
    } else if (indexToMove === 1) {
      if (timeLeft[1] < lowTimeLimit) isLowOnTime[1] = true;
    }
  }

  const showScores = scores[0] !== 0 || scores[1] !== 0;
  let sep;
  if (isLargeScreen && !showScores) sep = "15px";
  else if (isLargeScreen && showScores) sep = "12px";
  else if (!isLargeScreen && !showScores) sep = "8px";
  else sep = "6px";
  const fontSize = isLargeScreen ? "18px" : "14px";
  const nameFontSize = isLargeScreen ? "14px" : "10px";
  const childStyle = {
    padding: sep,
    fontSize: fontSize,
  };

  const [timer1, timer2, timerBg, lowTimeCol] = [
    getColor(boardTheme, "timer1", isDarkModeOn),
    getColor(boardTheme, "timer2", isDarkModeOn),
    getColor(menuTheme, "container", isDarkModeOn),
    getColor(boardTheme, "lowTime", isDarkModeOn),
  ];

  let formattedNames = [names[0], names[1]];
  if (names[0] === "Guest" && clientRole === RoleEnum.creator) {
    formattedNames[0] = "Guest (you)";
  }
  if (names[1] === "Guest" && clientRole === RoleEnum.joiner) {
    formattedNames[1] = "Guest (you)";
  } else if (!names[1]) {
    formattedNames[1] = "Waiting...";
  }

  const roundedRatings = [Math.round(ratings[0]), Math.round(ratings[1])];

  return (
    <div
      style={{
        backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
        display: "grid",
        gridTemplateColumns: showScores
          ? "0.5fr 1.7fr 0.2fr 1fr 1fr 0.2fr 1.7fr 0.5fr"
          : "1.7fr 0.2fr 1fr 1fr 0.2fr 1.7fr",
        gridTemplateRows: "auto",
        alignContent: "center",
        columnGap: sep,
        padding: sep,
        gridArea: "timer",
      }}
    >
      {showScores && (
        <div style={childStyle} className={"center"}>
          {scores[0]}
        </div>
      )}
      <div
        style={{
          padding: isLargeScreen ? sep : "3px",
          fontSize: nameFontSize,
          backgroundColor: pToMove[0] ? timer1 : timerBg,
        }}
        className={"center truncate" + (pToMove[0] ? " z-depth-2" : "")}
      >
        {formattedNames[0]}
        <br></br>
        {"(" + roundedRatings[0] + ")"}
      </div>
      <div style={childStyle} className={"center"}>
        {isPresentDot(arePlayersPresent[0], names[0])}
      </div>
      <div
        style={{
          padding: sep,
          fontSize: fontSize,
          backgroundColor: isLowOnTime[0] ? lowTimeCol : timerBg,
        }}
        className={"center" + (isLowOnTime[0] ? " z-depth-2" : "")}
      >
        {timesAsStrings[0]}
      </div>
      <div
        style={{
          padding: sep,
          fontSize: fontSize,
          backgroundColor: isLowOnTime[1] ? lowTimeCol : timerBg,
        }}
        className={"center" + (isLowOnTime[1] ? " z-depth-2" : "")}
      >
        {timesAsStrings[1]}
      </div>
      <div style={childStyle} className={"center"}>
        {isPresentDot(arePlayersPresent[1], names[1])}
      </div>
      <div
        style={{
          padding: isLargeScreen ? sep : "3px",
          fontSize: nameFontSize,
          backgroundColor: pToMove[1] ? timer2 : timerBg,
        }}
        className={"center truncate" + (pToMove[1] ? " z-depth-2" : "")}
      >
        {formattedNames[1]}
        <br></br>
        {names[1] === null ? "" : "(" + roundedRatings[1] + ")"}
      </div>
      {showScores && (
        <div style={childStyle} className={"center"}>
          {scores[1]}
        </div>
      )}
    </div>
  );
}

function dot(color: string, title: string): JSX.Element {
  return (
    <span
      style={{
        height: "10px",
        width: "10px",
        backgroundColor: color,
        borderRadius: "50%",
        display: "inline-block",
        border: "solid 1px black",
      }}
      title={title}
    ></span>
  );
}

function isPresentDot(isPresent: boolean, name: string): JSX.Element {
  if (isPresent) return dot("#67ff36", `${name} has the game open`);
  return dot("gray", `${name} does not have the game open`);
}
