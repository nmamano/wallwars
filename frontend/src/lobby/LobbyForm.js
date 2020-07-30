import React from "react";
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
  return (
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
        <Col s={1}>
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
        <Col s={5}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={3}>
          <Button node="button" waves="light" onClick={handleCreateGame}>
            Create game
          </Button>
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
          <Button node="button" waves="light" onClick={handleJoinGame}>
            Join game
          </Button>
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
  );
};

export default LobbyForm;
