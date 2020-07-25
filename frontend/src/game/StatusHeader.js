import React from "react";
import { Row, Col } from "react-materialize";

const StatusHeader = ({
  names,
  lifeCycleStage,
  winner,
  finishReason,
  turnCount,
  indexToMove,
  timeControl,
}) => {
  let msg;
  const nameToMove = names[indexToMove];
  switch (lifeCycleStage) {
    case -2:
      msg = "Haven't tried to connect to the server yet";
      break;
    case -1:
      msg = "Waiting for server response";
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
          finishReason === "time" ? "on time" : "by reaching the goal"
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
      <Col s={5}>
        <h6>{msg}</h6>
      </Col>
      <Col s={6}>
        {timeControl && (
          <h6>
            Time control: {timeControl.duration}+{timeControl.increment}
          </h6>
        )}
      </Col>
      <Col s={1}>
        <h6>{turnCount}</h6>
      </Col>
    </Row>
  );
};

export default StatusHeader;
