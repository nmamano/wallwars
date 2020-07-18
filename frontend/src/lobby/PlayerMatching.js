import React, { useState, useEffect } from "react";
import GamePage from "../game/GamePage";
import socketIOClient from "socket.io-client";

const PlayerMatching = (props) => {
  const params = props.location.state;

  const [gameParams, setGameParams] = useState(null);

  useEffect(() => {
    if (gameParams != null) return;
    const BACKEND_ENDPOINT = "localhost:4001"; //placeholder
    const socket = socketIOClient(BACKEND_ENDPOINT);
    if (params.isCreator) {
      socket.emit("createGame", params);
    } else {
      socket.emit("joinGame", params.gameId);
    }

    socket.on("gameCreated", () => {
      console.log("created game successfully");
      setGameParams(params);
    });

    socket.on("gameJoined", (serverParams) => {
      console.log("joined game successfully");
      serverParams.playerNames[1] = params.p2Name;
      setGameParams(serverParams);
    });
  });

  if (gameParams === null) return <div>Initializing game...</div>;
  return <GamePage params={gameParams} />;
};

export default PlayerMatching;
