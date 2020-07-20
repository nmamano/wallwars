import React from "react";
import { Row, Col } from "react-materialize";

//each stage in the life cycle of the game gets a status message
const getStatusMessage = (
  playerNames,
  lifeCycleStage,
  winner,
  finishReason,
  p1ToMove
) => {
  const [name1, name2] = playerNames;
  switch (lifeCycleStage) {
    case 0:
      return "Waiting for player 2 to join";
    case 1:
      return `${p1ToMove ? name1 : name2} starts`;
    case 2:
    case 3:
      return `${p1ToMove ? name1 : name2} to move`;
    case 4:
      if (winner === "draw") return "The game ended in draw";
      return `${winner === "1" ? name1 : name2} won on ${
        finishReason === "time" ? "on time" : "by reaching the goal"
      }`;
    default:
      console.error("stage should be in range 0..4");
  }
};

const StatusHeader = ({
  playerNames,
  lifeCycleStage,
  winner,
  finishReason,
  numMoves,
  p1ToMove,
}) => {
  const msg = getStatusMessage(
    playerNames,
    lifeCycleStage,
    winner,
    finishReason,
    p1ToMove
  );

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
