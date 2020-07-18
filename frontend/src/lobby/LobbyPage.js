import React, { useState } from "react";
import { Row, Col, TextInput, Button } from "react-materialize";
import socketIOClient from "socket.io-client";

import GamePage from "../game/GamePage";
import Header from "../shared/Header";

const randPlayerName = () => Math.random().toString(36).substring(2, 7);

const LobbyPage = () => {
  const BACKEND_ENDPOINT = "localhost:4001"; //placeholder

  const [playerName, setPlayerName] = useState(randPlayerName());
  const [duration, setDuration] = useState(5);
  const [increment, setIncrement] = useState(2);
  const [joinGameId, setJoinGameId] = useState("");
  const [serverParams, setServerParams] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isOngoingGame, setIsOngoingGame] = useState(false);

  const handlePlayerName = (props) => setPlayerName(props.target.value);
  const handleDuration = (props) => setDuration(props.target.value);
  const handleIncrement = (props) => setIncrement(props.target.value);
  const handleJoinGameId = (props) => setJoinGameId(props.target.value);

  const handleCreateGame = () => {
    const newSocket = socketIOClient(BACKEND_ENDPOINT);
    newSocket.on("gameCreated", (params) => {
      console.log("created game successfully");
      setServerParams(params);
      setIsOngoingGame(true);
    });
    newSocket.emit("createGame", {
      timeControl: { duration: duration, increment: increment },
      p1Name: playerName,
    });
    setSocket(newSocket);
  };
  const handleJoinGame = () => {
    const newSocket = socketIOClient(BACKEND_ENDPOINT);
    newSocket.on("gameJoined", (params) => {
      console.log("joined game successfully");
      setServerParams(params);
      setIsOngoingGame(true);
    });
    newSocket.emit("joinGame", {
      gameId: joinGameId,
      p2Name: playerName,
    });
    setSocket(newSocket);
  };

  const showGameHelp = () =>
    console.log("todo: show game help in modal window");
  const showLobbyHelp = () =>
    console.log("todo: show lobby help in modal window");

  if (isOngoingGame) {
    return (
      <div>
        <Header
          gameName={serverParams.gameId}
          showLobby
          endGame={() => setIsOngoingGame(false)}
          showHelp={showGameHelp}
        />
        <GamePage
          serverParams={serverParams}
          socket={socket}
        />
      </div>
    );
  }

  return (
    <div>
      <Header gameName={""} showHelp={showLobbyHelp} />
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
