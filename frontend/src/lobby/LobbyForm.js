import React, { useEffect } from "react";
import { Row, Col, TextInput, Button, Icon } from "react-materialize";

const LobbyForm = ({
  playerName,
  handlePlayerName,
  duration,
  handleDuration,
  increment,
  handleIncrement,
  joinGameId,
  handleJoinGameId,
  handleCreateGame,
  handleJoinGame,
  handleRefreshName,
}) => {
  useEffect(() => {
    window.addEventListener("keydown", downHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  });

  const downHandler = ({ key }) => {
    if (key !== "Enter") return;
    if (joinGameId.length > 0) handleJoinGame();
    else handleCreateGame();
  };

  return (
    <div className="container teal darken-2" style={{ marginTop: "2rem" }}>
      <Row className="valign-wrapper">
        <Col className="center" s={5} m={4}>
          <h5>Your name:</h5>
        </Col>
        <Col s={5} m={3}>
          <TextInput
            id="nameInput"
            value={playerName}
            onChange={handlePlayerName}
          />
        </Col>
        <Col s={1} m={1}>
          <Button
            className="teal lighten-2"
            node="button"
            waves="light"
            small
            floating
            style={{ color: "white" }}
            icon={<Icon>refresh</Icon>}
            onClick={handleRefreshName}
            tooltip={"Get a new name"}
          />
        </Col>
        <Col s={1} m={4}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={5} m={4}>
          <Button node="button" waves="light" onClick={handleCreateGame}>
            Create game
          </Button>
        </Col>
        <Col s={2} m={1} style={{ paddingRight: "0" }}>
          <TextInput
            id="durationInput"
            label="Duration"
            value={`${duration}`}
            onChange={handleDuration}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}>
          m
        </Col>
        <Col s={2} m={1} style={{ paddingRight: "0" }}>
          <TextInput
            id="incrementInput"
            label="Increment"
            value={`${increment}`}
            onChange={handleIncrement}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}>
          s
        </Col>
        <Col s={1} m={4}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={5} m={4}>
          <Button node="button" waves="light" onClick={handleJoinGame}>
            Join game
          </Button>
        </Col>
        <Col s={6} m={5}>
          <TextInput
            id="joinInput"
            placeholder="Write game code here..."
            value={`${joinGameId}`}
            onChange={handleJoinGameId}
          />
        </Col>
        <Col s={1} m={3}></Col>
      </Row>
    </div>
  );
};

export default LobbyForm;
