import React from "react";
import { Row, Col } from "react-materialize";

const StatusHeader = ({
  playerNames,
  lifeCycleStage,
  winner,
  finishReason,
  numMoves,
  p1ToMove,
}) => {
  let msg;
  const [name1, name2] = playerNames;
  switch (lifeCycleStage) {
    case -2:
      msg = "Haven't sent a message to the server yet";
      break;
    case -1:
      msg = "Waiting for server response";
      break;
    case 0:
      msg = "Waiting for player 2 to join";
      break;
    case 1:
      msg = `${p1ToMove ? name1 : name2} starts`;
      break;
    case 2:
    case 3:
      msg = `${p1ToMove ? name1 : name2} to move`;
      break;
    case 4:
      if (winner === "draw") msg = "The game ended in draw";
      msg = `${winner === "1" ? name1 : name2} won on ${
        finishReason === "time" ? "on time" : "by reaching the goal"
      }`;
      break;
    default:
      console.error("stage should be in range 0..4");
  }

  return (
    <Row
      className="container valign-wrapper"
      style={{ marginTop: "10px", marginBottom: "10px" }}
    >
      <Col s={8}>
        <h6>{msg}</h6>
      </Col>
      <Col s={3}></Col>
      <Col s={1}>
        <h6>{numMoves}</h6>
      </Col>
    </Row>
  );
};

export default StatusHeader;
