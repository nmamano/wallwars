import React, { useState } from "react";
import { Row, Col } from "react-materialize";
import { uniqueNamesGenerator, names } from "unique-names-generator";
import { useMediaQuery } from "react-responsive";
import { ToastContainer } from "react-toastify";
import { useCookies } from "react-cookie";

import GamePage from "../game/GamePage";
import Header from "../shared/Header";
import LobbyForm from "./LobbyForm";
import LobbyHelp from "./LobbyHelp";
import showToastNotification from "../shared/showToastNotification";
import GameShowcase from "./GameShowcase";

const maxPlayerNameLen = 9;

const randPlayerName = () =>
  uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  }).slice(0, maxPlayerNameLen);

const LobbyPage = ({ socket }) => {
  //the player name is saved in a cookie when the player uses a name
  //to create or join a game. the time control is saved when the player
  //creates a game
  const [cookies, setCookie] = useCookies([
    "playerName",
    "duration",
    "increment",
  ]);

  const [playerName, setPlayerName] = useState(
    cookies.playerName || randPlayerName()
  );
  const [duration, setDuration] = useState(cookies.duration || 5);
  const [increment, setIncrement] = useState(cookies.increment || 5);
  const [joinGameId, setJoinGameId] = useState("");
  const [isOngoingGame, setIsOngoingGame] = useState(false);
  const [creatorParams, setCreatorParams] = useState(null);
  const [joinerParams, setJoinerParams] = useState(null);
  const [isDarkModeOn, setIsDarkModeOn] = useState(false);

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
    } else if (dur > 120) {
      dur = 120;
      showToastNotification("Duration too long, using 2h instead", 5000);
    } else {
      setCookie("duration", dur, { path: "/" });
    }
    if (isNaN(inc) || inc < 0) {
      inc = 0;
      showToastNotification("Invalid increment, using 0s instead", 5000);
    } else if (inc > 300) {
      inc = 300;
      showToastNotification("Increment too large, using 5m instead", 5000);
    } else {
      setCookie("increment", inc, { path: "/" });
    }
    let name = playerName;
    if (name === "") name = "Anon";
    else setCookie("playerName", name, { path: "/" });
    setCreatorParams({
      timeControl: {
        duration: dur,
        increment: inc,
      },
      creatorName: name,
    });
    setIsOngoingGame(true);
  };
  const handleJoinGame = () => {
    let name = playerName;
    if (name === "") name = "Anon";
    else setCookie("playerName", name, { path: "/" });
    setJoinerParams({
      gameId: joinGameId,
      joinerName: name,
    });
    setIsOngoingGame(true);
  };

  const returnToLobby = () => {
    setIsOngoingGame(false);
    setCreatorParams(null);
    setJoinerParams(null);
    setJoinGameId("");
  };

  const backgroundColors = {
    dark: "#004d40",
    light: "#009688",
  };
  const handleToggleDarkMode = () => {
    setIsDarkModeOn((isDarkModeOn) => {
      //temporary hack -- not a proper way to change the bg color
      if (!isDarkModeOn)
        document.body.style.backgroundColor = backgroundColors.dark;
      else document.body.style.backgroundColor = backgroundColors.light;
      return !isDarkModeOn;
    });
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
          isDarkModeOn={isDarkModeOn}
          handleToggleDarkMode={handleToggleDarkMode}
        />
      )}
      {!isOngoingGame && (
        <div>
          <Header
            gameName={""}
            helpText={LobbyHelp()}
            isLargeScreen={isLargeScreen}
            isDarkModeOn={isDarkModeOn}
            handleToggleDarkMode={handleToggleDarkMode}
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
          <Row className="valign-wrapper">
            <Col className="center" m={12}>
              <h5 title={"Random games already played"}>Game Showcase</h5>
            </Col>
          </Row>
          <GameShowcase
            socket={socket}
            isLargeScreen={isLargeScreen}
            isDarkModeOn={isDarkModeOn}
          />
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
