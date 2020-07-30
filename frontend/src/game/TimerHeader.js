import React from "react";

const TimerHeader = ({
  lifeCycleStage,
  names,
  playerColors,
  timeLeft,
  indexToMove,
}) => {
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
  const highlightNameToMove = ["", ""];
  if (lifeCycleStage < 4) {
    //only if the game has not ended yet
    const turnHighlight = "lighten-1 z-depth-2";
    highlightNameToMove[
      indexToMove
    ] = ` ${playerColors[indexToMove]} ${turnHighlight}`;
  }

  const highlightLowTime = ["", ""];
  const lowTime = 15;
  const lowTimeColor = "orange lighten-2 z-depth-2";
  if (lifeCycleStage === 3) {
    if (indexToMove === 0) {
      if (timeLeft[0] < lowTime) highlightLowTime[0] = ` ${lowTimeColor}`;
    } else if (indexToMove === 1) {
      if (timeLeft[1] < lowTime) highlightLowTime[1] = ` ${lowTimeColor}`;
    }
  }

  const pStyle = { padding: "15px", fontSize: "18px" };

  return (
    <div
      className={"teal darken-2"}
      style={{
        display: "grid",
        gridTemplateColumns: "1.7fr 1fr 1fr 1.7fr",
        gridTemplateRows: "auto",
        alignContent: "center",
        columnGap: "15px",
        padding: "15px",
        gridArea: "timer",
      }}
    >
      <div className="truncate">
        <p style={pStyle} className={highlightNameToMove[0] + " center"}>
          {names[0]}
        </p>
      </div>
      <div>
        <p style={pStyle} className={highlightLowTime[0] + " center"}>
          {timesAsStrings[0]}
        </p>
      </div>
      <div>
        <p style={pStyle} className={highlightLowTime[1] + " center"}>
          {timesAsStrings[1]}
        </p>
      </div>
      <div className="truncate">
        <p style={pStyle} className={highlightNameToMove[1] + " center"}>
          {names[1] === null ? "______" : names[1]}
        </p>
      </div>
    </div>
  );
};

export default TimerHeader;
