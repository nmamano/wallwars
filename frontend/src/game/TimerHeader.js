import React from "react";

const TimerHeader = ({
  lifeCycleStage,
  names,
  playerColors,
  timeLeft,
  indexToMove,
  isLargeScreen,
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
    const turnHighlight = " lighten-1 z-depth-2";
    highlightNameToMove[indexToMove] =
      playerColors[indexToMove] + turnHighlight;
  }

  const highlightLowTime = ["", ""];
  const lowTime = 15;
  const lowTimeColor = " orange lighten-2 z-depth-2";
  if (lifeCycleStage === 3) {
    if (indexToMove === 0) {
      if (timeLeft[0] < lowTime) highlightLowTime[0] = lowTimeColor;
    } else if (indexToMove === 1) {
      if (timeLeft[1] < lowTime) highlightLowTime[1] = lowTimeColor;
    }
  }

  const pStyle = {
    padding: isLargeScreen ? "15px" : "8px",
    fontSize: isLargeScreen ? "18px" : "14px",
  };

  return (
    <div
      className={"teal darken-2"}
      style={{
        display: "grid",
        gridTemplateColumns: "1.7fr 1fr 1fr 1.7fr",
        gridTemplateRows: "auto",
        alignContent: "center",
        columnGap: isLargeScreen ? "15px" : "8px",
        padding: isLargeScreen ? "15px" : "8px",
        gridArea: "timer",
      }}
    >
      <div
        style={pStyle}
        className={highlightNameToMove[0] + " center truncate"}
      >
        {names[0]}
      </div>
      <div style={pStyle} className={highlightLowTime[0] + " center"}>
        {timesAsStrings[0]}
      </div>
      <div style={pStyle} className={highlightLowTime[1] + " center"}>
        {timesAsStrings[1]}
      </div>
      <div
        style={pStyle}
        className={highlightNameToMove[1] + " center truncate"}
      >
        {names[1] === null ? "______" : names[1]}
      </div>
    </div>
  );
};

export default TimerHeader;
