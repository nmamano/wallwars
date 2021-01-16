import React from "react";

import { roundNum } from "../shared/utils";
import { getColor } from "../shared/colorThemes";

const StatusHeader = ({
  names,
  lifeCycleStage,
  winner,
  finishReason,
  indexToMove,
  timeControl,
  creatorStarts,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
}) => {
  let msg;
  const nameToMove = names[indexToMove];
  const finishMessage = {
    time: "on time",
    goal: "by reaching the goal",
    resign: "by resignation",
    abandon: "by abandonment",
  };
  const drawFinishMessage = {
    goal: "by the 1-move rule",
    agreement: "by agreement",
  };
  switch (lifeCycleStage) {
    case -2:
      msg = "Haven't tried to connect to the server yet";
      break;
    case -1:
      msg = "Waking the server up...";
      break;
    case 0:
      msg = "Waiting for player 2 to join";
      break;
    case 1:
      msg = `${nameToMove} starts`;
      break;
    case 2:
    case 3:
      msg = `${nameToMove} to move`;
      break;
    case 4:
      if (winner === "draw")
        msg = "The game ended in a draw " + drawFinishMessage[finishReason];
      else
        msg = `${names[winner === "creator" ? 0 : 1]} won ${
          finishMessage[finishReason]
        }`;
      break;
    default:
      console.error("stage should be in range [-2..4]");
  }

  let firstMoveName = "";
  if (lifeCycleStage === 0 && creatorStarts) firstMoveName = names[0];
  else if (lifeCycleStage > 0) firstMoveName = names[creatorStarts ? 0 : 1];

  return (
    <div
      style={{
        backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
        display: "grid",
        gridTemplateColumns: "auto",
        gridTemplateRows: "1fr 1fr 1fr",
        alignItems: "center",
        padding: isLargeScreen ? "15px 15px" : "5px 15px",
        gridArea: "status",
      }}
    >
      <div>
        <p>{msg}</p>
      </div>
      <div>
        {timeControl && (
          <p>
            Time control: {roundNum(timeControl.duration)}+
            {roundNum(timeControl.increment)}
          </p>
        )}
      </div>
      <div>
        <p>{"First move: " + firstMoveName}</p>
      </div>
    </div>
  );
};

export default StatusHeader;
