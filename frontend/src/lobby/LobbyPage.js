import React, { useState, useEffect } from "react";
import { Row, Col, Button } from "react-materialize";
import { uniqueNamesGenerator, names } from "unique-names-generator";
import { useMediaQuery } from "react-responsive";
import { ToastContainer } from "react-toastify";
import { useCookies } from "react-cookie";

import { getColor } from "../shared/colorThemes";
import blueBgDark from "./../static/blueBgDark.jfif";
import blueBgLight from "./../static/blueBgLight.jfif";
import globalSettings from "../shared/globalSettings";
import GamePage from "../game/GamePage";
import Header from "../shared/Header";
import LobbyForm from "./LobbyForm";
import { lobbyHelpText, aboutText } from "./lobbyHelp";
import showToastNotification from "../shared/showToastNotification";
import GameShowcase from "./GameShowcase";
import RecentGameList from "./RecentGameList";

const maxPlayerNameLen = 9;

const randPlayerName = () =>
  uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  }).slice(0, maxPlayerNameLen);

const LobbyPage = ({ socket }) => {
  const [cookies, setCookie] = useCookies([
    //the name and token are saved when the player creates or joins a game
    "playerName",
    "token",
    //the time control is saved when the player creates a game
    "duration",
    "increment",
    //used to allow players to return to games they already started, even if they close the browser
    "cookieId",
    "isDarkModeOn",
    "menuTheme",
  ]);
  const boardTheme = "boardMonochrome";

  const [playerName, setPlayerName] = useState(
    cookies.playerName || randPlayerName()
  );
  const [token, setToken] = useState(cookies.token || "default");
  const [duration, setDuration] = useState(cookies.duration || 5);
  const [increment, setIncrement] = useState(cookies.increment || 5);
  const [joinCode, setJoinCode] = useState("");
  const [isGamePageOpen, setIsGamePageOpen] = useState(false);
  const [clientParams, setClientParams] = useState(null);
  const [isDarkModeOn, setIsDarkModeOn] = useState(
    cookies.isDarkModeOn && cookies.isDarkModeOn === "true" ? true : false
  );
  const [menuTheme, setMenuTheme] = useState(
    cookies.menuTheme && cookies.menuTheme === "green" ? "green" : "blue"
  );

  const [hasOngoingGame, setHasOngoingGame] = useState(false);

  const handlePlayerName = (props) => {
    setPlayerName(props.target.value.slice(0, maxPlayerNameLen));
  };
  const handleSetCookieId = (cookieId) => {
    setCookie("cookieId", cookieId, { path: "/" });
  };
  const handleToken = (icon) => {
    setToken(icon);
    setCookie("token", icon, { path: "/" });
  };
  const handleRefreshName = () => {
    setPlayerName(randPlayerName());
  };
  const handleDuration = (props) => setDuration(props.target.value);
  const handleIncrement = (props) => setIncrement(props.target.value);
  const handleJoinCode = (props) => setJoinCode(props.target.value);

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
    setClientParams({
      clientRole: "Creator",
      timeControl: {
        duration: dur,
        increment: inc,
      },
      name: name,
      token: token,
      cookieId: cookies.cookieId ? cookies.cookieId : "undefined",
    });
    setHasOngoingGame(false);
    setIsGamePageOpen(true);
  };
  const handleJoinGame = () => {
    let name = playerName;
    if (name === "") name = "Anon";
    else setCookie("playerName", name, { path: "/" });
    setClientParams({
      clientRole: "Joiner",
      joinCode: joinCode,
      name: name,
      token: token,
      cookieId: cookies.cookieId ? cookies.cookieId : "undefined",
    });
    setHasOngoingGame(false);
    setIsGamePageOpen(true);
  };
  const handleReturnToGame = () => {
    setClientParams({
      clientRole: "Returner",
      cookieId: cookies.cookieId,
    });
    setHasOngoingGame(false);
    setIsGamePageOpen(true);
  };
  const handleViewGame = (watchGameId) => {
    setClientParams({
      clientRole: "Spectator",
      gameId: watchGameId,
    });
    setHasOngoingGame(false);
    setIsGamePageOpen(true);
  };

  const returnToLobby = () => {
    setIsGamePageOpen(false);
    setHasOngoingGame(false);
    setClientParams(null);
    setJoinCode("");
  };

  const handleToggleDarkMode = () => {
    setCookie("isDarkModeOn", isDarkModeOn ? "false" : "true", { path: "/" });
    setIsDarkModeOn(!isDarkModeOn);
  };
  const handleToggleTheme = () => {
    const newTheme = menuTheme === "green" ? "blue" : "green";
    setCookie("menuTheme", newTheme, { path: "/" });
    setMenuTheme(newTheme);
  };

  useEffect(() => {
    if (
      cookies.cookieId &&
      cookies.cookieId !== "undefined" &&
      !hasOngoingGame
    ) {
      socket.emit("checkHasOngoingGame", { cookieId: cookies.cookieId });
    }
  });
  useEffect(() => {
    socket.on("respondHasOngoingGame", ({ res }) => {
      if (!isGamePageOpen) setHasOngoingGame(res);
    });
  });

  //effect to set the background color of the entire site based on dark mode
  useEffect(() => {
    document.body.style.backgroundColor = getColor(
      menuTheme,
      "background",
      isDarkModeOn
    );
    if (menuTheme === "blue") {
      document.body.style.backgroundImage = `url('${
        isDarkModeOn ? blueBgDark : blueBgLight
      }')`;
    } else {
      document.body.style.backgroundImage = "none";
    }
  }, [isDarkModeOn, menuTheme]);

  //preparing props for layout (duplicated with GamePage)
  const isLargeScreen = useMediaQuery({ query: "(min-width: 990px)" });
  const dims = globalSettings.boardDims;
  let [gSize, wWidth] = isLargeScreen
    ? [globalSettings.groundSize, globalSettings.wallWidth]
    : [
        globalSettings.smallScreenGroundSize,
        globalSettings.smallScreenWallWidth,
      ];
  const boardHeight = (wWidth * (dims.h - 1)) / 2 + (gSize * (dims.h + 1)) / 2;
  const boardWidth = (wWidth * (dims.w - 1)) / 2 + (gSize * (dims.w + 1)) / 2;
  const gapSize = isLargeScreen ? 15 : 6;
  let gridTemplateRows, gridTemplateColumns, gridTemplateAreas;
  const titleHeight = 40;
  const sideBySideLayout = useMediaQuery({ query: "(min-width: 1300px)" });
  if (sideBySideLayout) {
    gridTemplateRows = `${titleHeight}px ${boardHeight}px`;
    gridTemplateColumns = `${boardWidth}px ${boardWidth}px`;
    gridTemplateAreas =
      "'showcaseTitle recentTitle' 'gameShowcase recentGameList'";
  } else {
    gridTemplateRows = `${titleHeight}px ${boardHeight}px ${titleHeight}px ${boardHeight}px`;
    gridTemplateColumns = `${boardWidth}px`;
    gridTemplateAreas =
      "'showcaseTitle' 'gameShowcase' 'recentTitle' 'recentGameList'";
  }
  return (
    <div
      style={{
        paddingBottom: "2rem",
      }}
    >
      <ToastContainer />

      {isGamePageOpen && (
        <GamePage
          socket={socket}
          clientParams={clientParams}
          returnToLobby={returnToLobby}
          isLargeScreen={isLargeScreen}
          menuTheme={menuTheme}
          boardTheme={boardTheme}
          isDarkModeOn={isDarkModeOn}
          handleToggleDarkMode={handleToggleDarkMode}
          handleToggleTheme={handleToggleTheme}
          handleSetCookieId={handleSetCookieId}
        />
      )}
      {!isGamePageOpen && (
        <div>
          <Header
            context={"Lobby"}
            helpText={lobbyHelpText}
            aboutText={aboutText}
            isLargeScreen={isLargeScreen}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
            handleToggleDarkMode={handleToggleDarkMode}
            handleToggleTheme={handleToggleTheme}
          />
          <LobbyForm
            playerName={playerName}
            handlePlayerName={handlePlayerName}
            duration={duration}
            handleDuration={handleDuration}
            increment={increment}
            handleIncrement={handleIncrement}
            joinCode={joinCode}
            handleJoinCode={handleJoinCode}
            handleCreateGame={handleCreateGame}
            handleJoinGame={handleJoinGame}
            handleRefreshName={handleRefreshName}
            token={token}
            handleToken={handleToken}
            isLargeScreen={isLargeScreen}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
          {hasOngoingGame &&
            cookies.cookieId &&
            cookies.cookieId !== "undefined" && (
              <Row className="valign-wrapper" style={{ marginTop: "1rem" }}>
                <Col className="center" s={12}>
                  <Button
                    large
                    style={{
                      backgroundColor: getColor(
                        menuTheme,
                        "importantButton",
                        isDarkModeOn
                      ),
                    }}
                    node="button"
                    waves="light"
                    onClick={() => {
                      handleReturnToGame();
                    }}
                  >
                    Return to game
                  </Button>
                </Col>
              </Row>
            )}
          <div
            style={{
              display: "grid",
              gridTemplateRows: gridTemplateRows,
              gridTemplateColumns: gridTemplateColumns,
              gridTemplateAreas: gridTemplateAreas,
              columnGap: `${2 * gapSize}px`,
              rowGap: `${gapSize}px`,
              margin: `${gapSize}px`,
              justifyContent: "center",
              alignContent: "center",
            }}
          >
            <div
              style={{
                gridArea: "showcaseTitle",
                alignSelf: "center",
                justifySelf: "center",
                fontSize: "20px",
              }}
              title={"Random games already played"}
            >
              Game Showcase
            </div>
            <div style={{ gridArea: "gameShowcase" }}>
              <GameShowcase
                socket={socket}
                isLargeScreen={isLargeScreen}
                menuTheme={menuTheme}
                boardTheme={boardTheme}
                isDarkModeOn={isDarkModeOn}
                handleViewGame={handleViewGame}
              />
            </div>
            <div
              style={{
                gridArea: "recentTitle",
                alignSelf: "center",
                justifySelf: "center",
                fontSize: "20px",
              }}
            >
              Recent Games
            </div>
            <div style={{ gridArea: "recentGameList" }}>
              <RecentGameList
                socket={socket}
                isLargeScreen={isLargeScreen}
                menuTheme={menuTheme}
                isDarkModeOn={isDarkModeOn}
                handleViewGame={handleViewGame}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;
