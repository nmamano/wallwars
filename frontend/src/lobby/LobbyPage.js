import React, { useState } from "react";
import { uniqueNamesGenerator, names } from "unique-names-generator";
import { useMediaQuery } from "react-responsive";
import { ToastContainer } from "react-toastify";

import GamePage from "../game/GamePage";
import Header from "../shared/Header";
import LobbyForm from "./LobbyForm";
import LobbyHelp from "./LobbyHelp";
import showToastNotification from "../shared/showToastNotification";

const maxPlayerNameLen = 9;

const randPlayerName = () =>
  uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  }).slice(0, maxPlayerNameLen);

const LobbyPage = ({ socket }) => {
  const [playerName, setPlayerName] = useState(randPlayerName());
  const [duration, setDuration] = useState(5);
  const [increment, setIncrement] = useState(5);
  const [joinGameId, setJoinGameId] = useState("");
  const [isOngoingGame, setIsOngoingGame] = useState(false);
  const [creatorParams, setCreatorParams] = useState(null);
  const [joinerParams, setJoinerParams] = useState(null);

  const handlePlayerName = (props) => {
    setPlayerName(props.target.value.slice(0, maxPlayerNameLen));
  };

  const handleRefreshName = () => {
    setPlayerName(randPlayerName());
  };
  const handleDuration = (props) => setDuration(props.target.value);
  const handleIncrement = (props) => setIncrement(props.target.value);
  const handleJoinGameId = (props) => setJoinGameId(props.target.value);

  const handleCreateGame = () => {
    let [dur, inc] = [parseFloat(duration), parseFloat(increment)];
    if (isNaN(dur) || dur < 0.1) {
      dur = 5 / 60;
      showToastNotification("Invalid duration, using 5s instead", 5000);
    }
    if (isNaN(inc) || inc < 0) {
      inc = 0;
      showToastNotification("Invalid increment, using 0s instead", 5000);
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

  let isLargeScreen = useMediaQuery({ query: "(min-width: 990px)" });

  return (
    <div style={{ marginBottom: "2rem" }}>
      <ToastContainer />

      {isOngoingGame && (
        <GamePage
          socket={socket}
          creatorParams={creatorParams}
          joinerParams={joinerParams}
          returnToLobby={returnToLobby}
          isLargeScreen={isLargeScreen}
        />
      )}
      {!isOngoingGame && (
        <div>
          <Header
            gameName={""}
            helpText={LobbyHelp()}
            isLargeScreen={isLargeScreen}
          />
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
            handleRefreshName={handleRefreshName}
          />
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
