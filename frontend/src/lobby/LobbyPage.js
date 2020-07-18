import React, { useState, useEffect } from "react";
import { Row, Col, TextInput, Button } from "react-materialize";
import { Redirect } from "react-router-dom";
import socketIOClient from "socket.io-client";

import Header from "../shared/Header";

const randPlayerName = () => Math.random().toString(36).substring(2, 7);

//store (as global variables) the last configuration used,
//so the next time you go to the lobby you get the same configuration
var storedPlayerName = randPlayerName();
var storedDuration = 5;
var storedIncrement = 2;

const LobbyPage = () => {
  const showHelp = () => {
    console.log("todo: show lobby help in modal window");
  };

  const [playerName, setPlayerName] = useState(storedPlayerName);
  const [duration, setDuration] = useState(storedDuration);
  const [increment, setIncrement] = useState(storedIncrement);
  const [joinGameId, setJoinGameId] = useState("");
  const [createGameClicked, setCreateGameClicked] = useState(false);
  const [joinGameClicked, setJoinGameClicked] = useState(false);
  const [serverParams, setServerParams] = useState(null);

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
  const handleCreateGame = () => {
    setCreateGameClicked(true);
  };
  const handleJoinGame = () => {
    setJoinGameClicked(true);
  };

  useEffect(() => {
    if (createGameClicked === false && joinGameClicked === false) return;

    const BACKEND_ENDPOINT = "localhost:4001"; //placeholder
    const socket = socketIOClient(BACKEND_ENDPOINT);
    if (createGameClicked) {
      socket.emit("createGame", {
        timeControl: { duration: duration, increment: increment },
        p1Name: playerName,
      });
      setCreateGameClicked(false);
    } else {
      socket.emit("joinGame", { gameId: joinGameId, p2Name: playerName });
      setJoinGameClicked(false);
    }

    socket.on("gameCreated", (params) => {
      console.log("created game successfully");
      setServerParams(params);
    });

    socket.on("gameJoined", (params) => {
      console.log("joined game successfully");
      setServerParams(params);
    });
  }, [
    createGameClicked,
    joinGameClicked,
    duration,
    increment,
    playerName,
    joinGameId,
  ]);

  if (serverParams != null) {
    return (
      <Redirect
        to={{
          pathname: `/game/${serverParams.gameId}`,
          state: serverParams,
        }}
      />
    );
  }

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
    </div>
  );
};

export default LobbyPage;
