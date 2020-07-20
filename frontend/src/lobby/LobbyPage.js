import React, { useState } from "react";
import socketIOClient from "socket.io-client";
import { uniqueNamesGenerator, names } from "unique-names-generator";

import GamePage from "../game/GamePage";
import Header from "./Header";
import LobbyForm from "./LobbyForm";

const randPlayerName = () =>
  uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  });

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
    setJoinGameId("");
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

  return (
    <div>
      <Header
        gameName={isOngoingGame ? serverParams.gameId : ""}
        showLobby={isOngoingGame}
        endGame={() => setIsOngoingGame(false)}
        showHelp={isOngoingGame ? showGameHelp : showLobbyHelp}
      />
      {isOngoingGame && (
        <GamePage serverParams={serverParams} socket={socket} />
      )}
      {!isOngoingGame && (
        <LobbyForm
          playerName={playerName}
          handlePlayerName={handlePlayerName}
          duration={duration}
          handleDuration={handleDuration}
          increment={increment}
          handleIncrement={handleIncrement}
          joinGameId={joinGameId}
          handleJoinGameId={handleJoinGameId}
          handleCreateGame={handleCreateGame}
          handleJoinGame={handleJoinGame}
        />
      )}
    </div>
  );
};

export default LobbyPage;
