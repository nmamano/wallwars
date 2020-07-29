import React from "react";
import { Row, Col } from "react-materialize";

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

  return (
    <Row
      className="container valign-wrapper"
      style={{ marginTop: "10px", marginBottom: "10px" }}
    >
      <Col s={4}>
        <h6 className="left-align">{msg}</h6>
      </Col>
      <Col s={4}>
        {timeControl && (
          <h6 className="center-align">
            Time control: {timeControl.duration}+{timeControl.increment}
          </h6>
        )}
      </Col>
      <Col s={4} className="right">
        {lifeCycleStage > 1 && (
          <h6 className="right-align">
            {names[creatorStarts ? 0 : 1] + " started"}
          </h6>
        )}
      </Col>
    </Row>
  );
};

export default StatusHeader;
