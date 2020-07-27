import React, { useState } from "react";
import { uniqueNamesGenerator, names } from "unique-names-generator";

import GamePage from "../game/GamePage";
import Header from "../shared/Header";
import LobbyForm from "./LobbyForm";
import LobbyHelp from "./LobbyHelp";
const randPlayerName = () =>
  uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  }).slice(0, 6);

const LobbyPage = ({ socket }) => {
  const [playerName, setPlayerName] = useState(randPlayerName());
  const [duration, setDuration] = useState(3);
  const [increment, setIncrement] = useState(2);
  const [joinGameId, setJoinGameId] = useState("");
  const [isOngoingGame, setIsOngoingGame] = useState(false);
  const [creatorParams, setCreatorParams] = useState(null);
  const [joinerParams, setJoinerParams] = useState(null);

  const handlePlayerName = (props) => {
    const maxNameLen = 8;
    setPlayerName(props.target.value.slice(0, maxNameLen));
  };
  const handleDuration = (props) => setDuration(props.target.value);
  const handleIncrement = (props) => setIncrement(props.target.value);
  const handleJoinGameId = (props) => setJoinGameId(props.target.value);

  const handleCreateGame = () => {
    let [dur, inc] = [parseFloat(duration), parseFloat(increment)];
    if (isNaN(dur) || dur < 0.1) {
      dur = 3;
      console.log(
        "given duration is not a number, using default value instead"
      );
    }
    if (isNaN(inc) || inc < 0) {
      inc = 2;
      console.log(
        "given increment is not a number, using default value instead"
      );
    }
    setCreatorParams({
      timeControl: {
        duration: dur,
        increment: inc,
      },
      creatorName: playerName === "" ? "Anon" : playerName,
    });
    setIsOngoingGame(true);
  };
  const handleJoinGame = () => {
    setJoinerParams({
      gameId: joinGameId,
      joinerName: playerName === "" ? "Anon" : playerName,
    });
    setIsOngoingGame(true);
  };

  const returnToLobby = () => {
    setIsOngoingGame(false);
    setCreatorParams(null);
    setJoinerParams(null);
    setJoinGameId("");
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      {isOngoingGame && (
        <GamePage
          socket={socket}
          creatorParams={creatorParams}
          joinerParams={joinerParams}
          returnToLobby={returnToLobby}
        />
      )}
      {!isOngoingGame && (
        <div>
          <Header gameName={""} helpText={LobbyHelp()} />
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
