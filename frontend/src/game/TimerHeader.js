import React from "react";
import { Row, Col } from "react-materialize";

const TimerHeader = ({
  playerNames,
  playerColors,
  remainingTime,
  p1ToMove,
}) => {
  const actor = p1ToMove ? 1 : 2;
  const name1 = playerNames[0];
  const name2 = playerNames[1] === null ? "......" : playerNames[1];
  const [color1, color2] = playerColors;
  const turnHighlight = "lighten-1 z-depth-2";
  const lowTimeColor = "orange lighten-2 z-depth-3";
  const lowTime = 15;
  const [time1, time2] = remainingTime;

  return (
    <Row className="valign-wrapper container">
      <Col
        className={
          "center" + (actor === 1 ? ` ${color1} ${turnHighlight}` : "")
        }
        s={2}
      >
        <h5>{name1}</h5>
      </Col>
      <Col
        className={
          "center" + (actor === 1 && time1 < lowTime ? ` ${lowTimeColor}` : "")
        }
        s={2}
        style={{ margin: "0rem 1rem" }}
      >
        <h5>{time1}s</h5>
      </Col>
      <Col s={4}></Col>
      <Col
        className={
          "center" + (actor === 2 && time2 < lowTime ? ` ${lowTimeColor}` : "")
        }
        s={2}
        style={{ margin: "0rem 1rem" }}
      >
        <h5>{time2}s</h5>
      </Col>
      <Col
        className={
          "center" + (actor === 2 ? ` ${color2} ${turnHighlight}` : "")
        }
        s={2}
      >
        <h5>{name2}</h5>
      </Col>
    </Row>
  );
};

export default TimerHeader;
