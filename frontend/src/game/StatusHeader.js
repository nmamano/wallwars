import React from "react";

const StatusHeader = ({
  names,
  lifeCycleStage,
  winner,
  finishReason,
  indexToMove,
  timeControl,
  creatorStarts,
}) => {
  let msg;
  const nameToMove = names[indexToMove];
  const finishMessage = {
    time: "on time",
    goal: "by reaching the goal",
    resign: "by resignation",
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
      if (winner === "draw") msg = "The game ended in a draw";
      else
        msg = `${names[winner === "creator" ? 0 : 1]} won ${
          finishMessage[finishReason]
        }`;
      break;
    default:
      console.error("stage should be in range [-2..4]");
  }

  const roundNum = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  return (
    <div
      className={"teal darken-2"}
      style={{
        display: "grid",
        gridTemplateColumns: "auto",
        gridTemplateRows: "1fr 1fr 1fr",
        alignItems: "center",
        padding: "15px",
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
        <p>
          {"First move:" +
            (lifeCycleStage > 1 ? ` ${names[creatorStarts ? 0 : 1]}` : "")}
        </p>
      </div>
    </div>
  );
};

export default StatusHeader;
