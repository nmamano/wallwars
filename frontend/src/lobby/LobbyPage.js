import React, { useState } from "react";
import { uniqueNamesGenerator, names } from "unique-names-generator";

import GamePage from "../game/GamePage";
import Header from "../shared/Header";
import LobbyForm from "./LobbyForm";

const randPlayerName = () =>
  uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  });

const LobbyPage = ({ socket }) => {
  const [playerName, setPlayerName] = useState(randPlayerName());
  const [duration, setDuration] = useState(5);
  const [increment, setIncrement] = useState(2);
  const [joinGameId, setJoinGameId] = useState("");
  const [isOngoingGame, setIsOngoingGame] = useState(false);
  const [creatorParams, setCreatorParams] = useState(null);
  const [joinerParams, setJoinerParams] = useState(null);

  const handlePlayerName = (props) => setPlayerName(props.target.value);
  const handleDuration = (props) => setDuration(props.target.value);
  const handleIncrement = (props) => setIncrement(props.target.value);
  const handleJoinGameId = (props) => setJoinGameId(props.target.value);

  const handleCreateGame = () => {
    setCreatorParams({
      timeControl: { duration: duration, increment: increment },
      p1Name: playerName,
    });
    setIsOngoingGame(true);
  };
  const handleJoinGame = () => {
    setJoinerParams({ gameId: joinGameId, p2Name: playerName });
    setIsOngoingGame(true);
  };

  const showLobbyHelp = () =>
    console.log("todo: show lobby help in modal window");

  return (
    <div>
      {isOngoingGame && (
        <GamePage
          socket={socket}
          creatorParams={creatorParams}
          joinerParams={joinerParams}
          setIsOngoingGame={setIsOngoingGame}
        />
      )}
      {!isOngoingGame && (
        <div>
          <Header gameName={""} showHelp={showLobbyHelp} />
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
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
