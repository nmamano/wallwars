import React, { useState } from "react";
import { Row, Col, TextInput, Button } from "react-materialize";
import { Link } from "react-router-dom";

import Header from "../shared/Header";

//store (as global variables) the last configuration used,
//so the next time you go to the lobby you get the same configuration
var storedPlayerName = Math.random().toString(36).substring(2, 7);
var storedDuration = 5;
var storedIncrement = 2;

const LobbyPage = () => {
  const showHelp = () => {
    console.log("todo: show lobby help in modal window");
  };

  const randomGameId = () => Math.random().toString(36).substring(2, 8);

  const [playerName, setPlayerName] = useState(storedPlayerName);
  const [duration, setDuration] = useState(storedDuration);
  const [increment, setIncrement] = useState(storedIncrement);
  const [joinGameId, setJoinGameId] = useState("");

  const handlePlayerName = (props) => {
    storedPlayerName = props.target.value;
    setPlayerName(storedPlayerName);
  };
  const handleDuration = (props) => {
    storedDuration = props.target.value;
    setDuration(storedDuration);
  };
  const handleIncrement = (props) => {
    storedIncrement = props.target.value;
    setIncrement(storedIncrement);
  };
  const handleJoinGameId = (props) => {
    setJoinGameId(props.target.value);
  };

  const newGameId = randomGameId();

  return (
    <div>
      <Header gameName={""} showHelp={showHelp} />
      <div className="container teal darken-2" style={{ marginTop: "2rem" }}>
        <Row className="valign-wrapper">
          <Col className="center" s={3}>
            <h5>Your name:</h5>
          </Col>
          <Col s={3}>
            <TextInput
              id="nameInput"
              value={playerName}
              onChange={handlePlayerName}
            />
          </Col>
          <Col s={6}></Col>
        </Row>
        <Row className="valign-wrapper">
          <Col className="center" s={3}>
            <Link
              to={{
                pathname: `/game/${newGameId}`,
                state: {
                  duration: duration,
                  increment: increment,
                  p1Name: playerName,
                },
              }}
            >
              <Button node="button" waves="light">
                Create game
              </Button>
            </Link>
          </Col>
          <Col s={1} style={{ paddingRight: "0" }}>
            <TextInput
              id="durationInput"
              label="Duration"
              value={`${duration}`}
              onChange={handleDuration}
            />
          </Col>
          <Col s={1} style={{ paddingLeft: "0" }}>
            m
          </Col>
          <Col s={1} style={{ paddingRight: "0" }}>
            <TextInput
              id="incrementInput"
              label="Increment"
              value={`${increment}`}
              onChange={handleIncrement}
            />
          </Col>
          <Col s={1} style={{ paddingLeft: "0" }}>
            s
          </Col>
          <Col s={5}></Col>
        </Row>
        <Row className="valign-wrapper">
          <Col className="center" s={3}>
            <Link
              to={{
                pathname: `/game/${joinGameId}`,
                state: {
                  p2Name: playerName,
                },
              }}
            >
              <Button node="button" waves="light">
                Join game
              </Button>
            </Link>
          </Col>
          <Col s={5}>
            <TextInput
              id="joinInput"
              placeholder="Write game code here..."
              value={`${joinGameId}`}
              onChange={handleJoinGameId}
            />
          </Col>
          <Col s={4}></Col>
        </Row>
      </div>
    </div>
  );
};

export default LobbyPage;
