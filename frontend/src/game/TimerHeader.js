import React from "react";

const TimerHeader = ({
  lifeCycleStage,
  names,
  playerColors,
  timeLeft,
  indexToMove,
  isLargeScreen,
  scores,
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

  const showScores = scores[0] !== 0 || scores[1] !== 0;
  let sep;
  if (isLargeScreen && !showScores) sep = "15px";
  else if (isLargeScreen && showScores) sep = "12px";
  else if (!isLargeScreen && !showScores) sep = "8px";
  else sep = "6px";
  const childStyle = {
    padding: sep,
    fontSize: isLargeScreen ? "18px" : "14px",
  };

  return (
    <div
      className={"teal darken-2"}
      style={{
        display: "grid",
        gridTemplateColumns: showScores
          ? "0.5fr 1.7fr 1fr 1fr 1.7fr 0.5fr"
          : "1.7fr 1fr 1fr 1.7fr",
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
        style={childStyle}
        className={highlightNameToMove[0] + " center truncate"}
      >
        {names[0]}
      </div>
      <div style={childStyle} className={highlightLowTime[0] + " center"}>
        {timesAsStrings[0]}
      </div>
      <div style={childStyle} className={highlightLowTime[1] + " center"}>
        {timesAsStrings[1]}
      </div>
      <div
        style={childStyle}
        className={highlightNameToMove[1] + " center truncate"}
      >
        {names[1] === null ? "______" : names[1]}
      </div>
      {showScores && (
        <div style={childStyle} className={"center"}>
          {scores[1]}
        </div>
      )}
    </div>
  );
};

export default TimerHeader;
