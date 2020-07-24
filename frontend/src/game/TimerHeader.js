import React from "react";
import { Row, Col } from "react-materialize";

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
  const lowTimeColor = "orange lighten-2 z-depth-3";
  if (lifeCycleStage === 3) {
    if (indexToMove === 0) {
      if (timeLeft[0] < lowTime) highlightLowTime[0] = ` ${lowTimeColor}`;
    } else if (indexToMove === 1) {
      if (timeLeft[1] < lowTime) highlightLowTime[1] = ` ${lowTimeColor}`;
    }
  }

  return (
    <Row className="valign-wrapper container">
      <Col className={"center" + highlightNameToMove[0]} s={2}>
        <h5>{names[0]}</h5>
      </Col>
      <Col
        className={"center" + highlightLowTime[0]}
        s={2}
        style={{ margin: "0rem 1rem" }}
      >
        <h5>{timesAsStrings[0]}</h5>
      </Col>
      <Col s={4}></Col>
      <Col
        className={"center" + highlightLowTime[1]}
        s={2}
        style={{ margin: "0rem 1rem" }}
      >
        <h5>{timesAsStrings[1]}</h5>
      </Col>
      <Col className={"center" + highlightNameToMove[1]} s={2}>
        <h5>{names[1] === null ? "______" : names[1]}</h5>
      </Col>
    </Row>
  );
};

export default TimerHeader;
