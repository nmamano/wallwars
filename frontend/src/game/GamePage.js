import React, { useEffect } from "react";
import { Button, Row, Col } from "react-materialize";
import { useImmer } from "use-immer";
import UIfx from "uifx";
import moveSoundAudio from "./../static/moveSound.mp3";
import showToastNotification from "../shared/showToastNotification";
import { useCookies } from "react-cookie";

import globalSettings from "../shared/globalSettings";
import {
  turnCount,
  creatorToMove,
  indexToMove,
  ghostType,
  isOpponentPresent,
  createInitialState,
  applyAddCreator,
  applyAddJoiner,
  applyCreatedOnServer,
  applyJoinedOnServer,
  applyJoinerJoined,
  applyReturnToGame,
  applyReceivedGame,
  applyMove,
  applySelectedCell,
  applyDrawGame,
  applyResignGame,
  applyAbandonGame,
  applyTakeback,
  applySetupRematch,
  applyAddExtraTime,
  applyClockTick,
} from "./gameState";

import Board from "./Board";
import Header from "../shared/Header";
import Dialog from "../shared/Dialog";
import StatusHeader from "./StatusHeader";
import TimerHeader from "./TimerHeader";
import gameHelp from "./gameHelp";
import ControlPanel from "./ControlPanel";
import { getColor } from "../shared/colorThemes";

const moveSound = new UIfx(moveSoundAudio);
const playMoveSound = () => {
  moveSound.play();
};
const boardDims = globalSettings.boardDims;

const GamePage = ({
  socket,
  //clientParams contains 'clientRole' as well as other fields
  //that depend on the client role
  clientParams,
  returnToLobby,
  isLargeScreen,
  menuTheme,
  boardTheme,
  isDarkModeOn,
  handleToggleDarkMode,
  handleToggleTheme,
  handleSetCookieId,
}) => {
  //cosmetic state stored between sessions
  const [cookies, setCookie] = useCookies(["isVolumeOn", "zoomLevel"]);

  //the 'state' object contains every other piece of state
  const [state, updateState] = useImmer(createInitialState(cookies));

  //===================================================
  //communication FROM the server
  //===================================================
  useEffect(() => {
    socket.once("gameCreated", ({ joinCode, creatorStarts, cookieId }) => {
      handleSetCookieId(cookieId);
      updateState((draftState) => {
        applyCreatedOnServer(draftState, joinCode, creatorStarts);
      });
    });
    socket.once(
      "gameJoined",
      ({
        creatorName,
        creatorToken,
        timeControl,
        creatorStarts,
        cookieId,
        creatorPresent,
      }) => {
        handleSetCookieId(cookieId);
        updateState((draftState) => {
          applyJoinedOnServer(
            draftState,
            creatorName,
            creatorToken,
            timeControl,
            creatorStarts,
            creatorPresent
          );
        });
      }
    );
    socket.once("requestedGame", ({ game }) => {
      updateState((draftState) => {
        applyReceivedGame(draftState, game);
      });
    });
    socket.on("returnedToOngoingGame", ({ ongoingGame, timeLeft }) => {
      updateState((draftState) => {
        applyReturnToGame(
          draftState,
          clientParams.cookieId,
          ongoingGame,
          timeLeft
        );
        draftState.waitingForPing = 0;
      });
    });
    socket.on("opponentReturned", () => {
      updateState((draftState) => {
        draftState.arePlayersPresent[
          draftState.clientRole === "Creator" ? 1 : 0
        ] = true;
        draftState.waitingForPing = 0;
      });
    });
    socket.on("ongoingGameNotFound", () => {
      showToastNotification("Couldn't find the game anymore.", 5000);
      returnToLobby();
    });
    socket.on("gameJoinFailed", () => {
      showToastNotification(
        "There is no game with this code waiting for someone to join.",
        5000
      );
      returnToLobby();
    });
    socket.on("joinSelfGameFailed", () => {
      showToastNotification(
        "You cannot play against yourself. To play as both sides from the same browser, play one of the sides from an Incognito window.",
        12000
      );
      returnToLobby();
    });
    socket.on("gameNotFoundError", () => {
      showToastNotification(
        "There was an issue on the server and we couldn't reach the other player.",
        5000
      );
      updateState((draftState) => {
        draftState.waitingForPing = 0;
      });
    });
    socket.once("joinerJoined", ({ joinerName, joinerToken }) => {
      updateState((draftState) => {
        if (draftState.lifeCycleStage === 1) return;
        if (draftState.isVolumeOn) playMoveSound();
        applyJoinerJoined(draftState, joinerName, joinerToken);
        draftState.arePlayersPresent[1] = true;
        draftState.waitingForPing = 0;
      });
    });

    socket.on("drawOffered", () => {
      updateState((draftState) => {
        draftState.showDrawDialog = true;
        draftState.waitingForPing = 0;
      });
    });
    socket.on("drawRejected", () => {
      showToastNotification("The opponent declined the draw offer.", 5000);
      updateState((draftState) => {
        draftState.waitingForPing = 0;
      });
    });
    socket.on("drawAccepted", () => {
      showToastNotification("The opponent accepted the draw offer.", 5000);
      updateState((draftState) => {
        applyDrawGame(draftState, "agreement");
        draftState.waitingForPing = 0;
      });
    });
    socket.on("takebackRequested", () => {
      updateState((draftState) => {
        draftState.showTakebackDialog = true;
        draftState.waitingForPing = 0;
      });
    });
    socket.on("takebackRejected", () => {
      showToastNotification(
        "The opponent declined the takeback request.",
        5000
      );
      updateState((draftState) => {
        draftState.waitingForPing = 0;
      });
    });
    socket.on("takebackAccepted", () => {
      showToastNotification("The opponent agreed to the takeback.", 5000);
      updateState((draftState) => {
        const requesterIsCreator = draftState.clientRole === "Creator";
        applyTakeback(draftState, requesterIsCreator);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("rematchOffered", () => {
      updateState((draftState) => {
        draftState.showRematchDialog = true;
        draftState.waitingForPing = 0;
      });
    });
    socket.on("rematchRejected", () => {
      showToastNotification("The opponent declined the rematch offer.", 5000);
      updateState((draftState) => {
        draftState.waitingForPing = 0;
      });
    });
    socket.on("rematchAccepted", () => {
      showToastNotification("The opponent accepted the rematch offer.", 5000);
      updateState((draftState) => {
        if (draftState.isVolumeOn) playMoveSound();
        applySetupRematch(draftState);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("extraTimeReceived", () => {
      showToastNotification("The opponent added 60s to your clock.", 5000);
      updateState((draftState) => {
        const playerIndex = draftState.clientRole === "Creator" ? 0 : 1;
        applyAddExtraTime(draftState, playerIndex);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("resigned", () => {
      showToastNotification("The opponent resigned.", 5000);
      updateState((draftState) => {
        if (draftState.isVolumeOn) playMoveSound();
        const resignerIsCreator = draftState.clientRole !== "Creator";
        applyResignGame(draftState, resignerIsCreator);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("moved", ({ actions, moveIndex, remainingTime }) => {
      updateState((draftState) => {
        console.log(`move ${moveIndex} received (${remainingTime}s)`);
        if (draftState.isVolumeOn) playMoveSound();
        applyMove(draftState, actions, remainingTime, moveIndex);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("leftGame", () => {
      updateState((draftState) => {
        draftState.arePlayersPresent[
          draftState.clientRole === "Creator" ? 1 : 0
        ] = false;
        draftState.waitingForPing = 0;
      });
    });
    socket.on("abandonedGame", () => {
      showToastNotification("The opponent abandoned the game.", 5000);
      updateState((draftState) => {
        const abandonerIsCreator =
          draftState.clientRole === "Creator" ? false : true;
        applyAbandonGame(draftState, abandonerIsCreator);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("pongFromServer", () => {
      updateState((draftState) => {
        draftState.waitingForPing = 0;
      });
    });
    return () => {
      socket.removeAllListeners();
    };
  }, [
    socket,
    updateState,
    returnToLobby,
    handleSetCookieId,
    clientParams.cookieId,
  ]);

  //===================================================
  //communication TO the server
  //===================================================
  //first contact to server
  useEffect(() => {
    //first contact only from lifecycle stage -2
    if (state.lifeCycleStage !== -2) return;
    if (clientParams.clientRole === "Creator") {
      updateState((draftState) => {
        applyAddCreator(
          draftState,
          clientParams.timeControl,
          clientParams.name,
          clientParams.token
        );
        draftState.arePlayersPresent[0] = true;
      });
      socket.emit("createGame", {
        name: clientParams.name,
        timeControl: clientParams.timeControl,
        token: clientParams.token,
        cookieId: clientParams.cookieId,
      });
    } else if (clientParams.clientRole === "Joiner") {
      updateState((draftState) => {
        applyAddJoiner(
          draftState,
          clientParams.joinCode,
          clientParams.name,
          clientParams.token
        );
        draftState.arePlayersPresent[1] = true;
      });
      socket.emit("joinGame", {
        joinCode: clientParams.joinCode,
        name: clientParams.name,
        token: clientParams.token,
        cookieId: clientParams.cookieId,
      });
    } else if (clientParams.clientRole === "Spectator") {
      socket.emit("getGame", { gameId: clientParams.gameId });
    } else if (clientParams.clientRole === "Returner") {
      socket.emit("returnToOngoingGame", { cookieId: clientParams.cookieId });
    } else {
      console.error("unknown client role", clientParams.clientRole);
    }
  });

  const handleLeaveGame = () => {
    socket.emit("leaveGame");
    returnToLobby();
  };
  const handleSendRematchOffer = () => {
    socket.emit("offerRematch");
  };
  const handleAnswerRematchOffer = (accepted) => {
    if (accepted) {
      socket.emit("acceptRematch");
      updateState((draftState) => {
        applySetupRematch(draftState);
      });
    } else {
      socket.emit("rejectRematch");
      updateState((draftState) => {
        draftState.showRematchDialog = false;
      });
    }
  };
  const handleOfferDraw = () => {
    socket.emit("offerDraw");
  };
  const handleAnswerDrawOffer = (accepted) => {
    if (accepted) {
      socket.emit("acceptDraw");
      updateState((draftState) => {
        applyDrawGame(draftState, "agreement");
      });
    } else {
      socket.emit("rejectDraw");
      updateState((draftState) => {
        draftState.showDrawDialog = false;
      });
    }
  };
  const handleRequestTakeback = () => {
    socket.emit("requestTakeback");
  };
  const handleAnswerTakebackRequest = (accepted) => {
    if (accepted) {
      showToastNotification(
        "The last move played on the board has been undone.",
        5000
      );
      socket.emit("acceptTakeback");
      updateState((draftState) => {
        const requesterIsCreator = draftState.clientRole === "Joiner";
        applyTakeback(draftState, requesterIsCreator);
      });
    } else {
      socket.emit("rejectTakeback");
      updateState((draftState) => {
        draftState.showTakebackDialog = false;
      });
    }
  };
  const handleGiveExtraTime = () => {
    socket.emit("giveExtraTime");
    updateState((draftState) => {
      const receiverIndex = draftState.clientRole === "Creator" ? 1 : 0;
      applyAddExtraTime(draftState, receiverIndex);
    });
  };
  const handleResign = () => {
    socket.emit("resign");
    updateState((draftState) => {
      applyResignGame(draftState, draftState.clientRole === "Creator");
    });
  };

  //===================================================
  //timers logic
  //===================================================
  //timer interval to update clocks every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateState((draftState) => {
        applyClockTick(draftState);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [updateState]);

  //===================================================
  //ping logic
  //===================================================
  useEffect(() => {
    const pingInterval = 5000;
    const interval = setInterval(() => {
      if (state.lifeCycleStage !== 3) return;
      if (state.waitingForPing === 1) {
        socket.emit("pingServer");
      } else if (state.waitingForPing === 2) {
        showToastNotification(
          "The server is not responding. The game is probably lost. Sorry for the inconvenience.",
          8000
        );
      }
      updateState((draftState) => {
        draftState.waitingForPing = (draftState.waitingForPing + 1) % 3;
      });
    }, pingInterval);
    return () => clearInterval(interval);
  }, [socket, state.lifeCycleStage, state.waitingForPing, updateState]);

  //===================================================
  //game logic when a player selects a board cell
  //===================================================
  //manage the state change on click or keyboard press. this may
  //change the ghost action (which is only shown to this client), or
  //make a full move, in which case it is also sent to the other client
  const handleSelectedCell = (pos) => {
    updateState((draftState) => {
      const clientToMove =
        creatorToMove(draftState) === (draftState.clientRole === "Creator");
      applySelectedCell(draftState, pos, clientToMove, true);
    });
  };

  useEffect(() => {
    if (state.moveToSend) {
      socket.emit("move", state.moveToSend);
      updateState((draftState) => {
        draftState.moveToSend = null;
      });
    }
  });

  //notify server if someone has won by reaching the goal or on time
  //this is necessary because the server does not run its own clock
  //and does not understand the rules of the game
  useEffect(() => {
    if (state.clientRole === "Spectator") return;
    if (state.finishReason === "goal") {
      socket.emit("playerReachedGoal", { winner: state.winner });
    }
    if (state.finishReason === "time") {
      socket.emit("playerWonOnTime", { winner: state.winner });
    }
  }, [socket, state.clientRole, state.winner, state.finishReason]);

  const handleBoardClick = (clickedPos) => handleSelectedCell(clickedPos);

  //===================================================
  //handling keyboard inputs
  //===================================================
  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  });
  const downHandler = ({ key }) => {
    //mechanism to avoid double-counting
    if (state.isKeyPressed) return;
    updateState((draftState) => {
      draftState.isKeyPressed = true;
    });
    if (key === "m") {
      handleToggleVolume();
      return;
    }

    //if the user is not looking at the latest position,
    //or if the game is over, arrows are used to navigate
    if (state.viewIndex < turnCount(state) || state.lifeCycleStage === 4) {
      if (key === "ArrowDown" || key === "ArrowRight") {
        if (state.viewIndex < turnCount(state)) {
          updateState((draftState) => {
            draftState.viewIndex += 1;
          });
        }
      } else if (key === "ArrowUp" || key === "ArrowLeft") {
        if (state.viewIndex > 0) {
          updateState((draftState) => {
            draftState.viewIndex -= 1;
          });
        }
      }
      return;
    }
    //normal case: use arrow keys to move the player token
    let p;
    if (state.ghostAction && ghostType(state.ghostAction) === "Ground")
      p = state.ghostAction;
    else {
      const tc = turnCount(state);
      p = state.moveHistory[tc].playerPos[indexToMove(state)];
    }
    if (key === "ArrowDown") p = { r: p.r + 2, c: p.c };
    else if (key === "ArrowUp") p = { r: p.r - 2, c: p.c };
    else if (key === "ArrowLeft") p = { r: p.r, c: p.c - 2 };
    else if (key === "ArrowRight") p = { r: p.r, c: p.c + 2 };
    else return;
    handleSelectedCell(p);
  };
  const upHandler = () => {
    updateState((draftState) => {
      draftState.isKeyPressed = false;
    });
  };

  //===================================================
  //logic related to navigating through the move history
  //===================================================
  const handleViewMove = (i) => {
    if (i < 0 || i > turnCount(state)) return;
    updateState((draftState) => {
      if (draftState.viewIndex === i) return;
      if (i > turnCount(draftState)) return;
      draftState.viewIndex = i;
      draftState.ghostAction = null;
    });
  };

  //move the inner scroll bar on move history to the end after each move
  useEffect(() => {
    const moveHistoryDiv = document.getElementById("movehistory");
    moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
  }, [state.moveHistory]);

  const handleSeePreviousMove = () => handleViewMove(state.viewIndex - 1);
  const handleSeeNextMove = () => handleViewMove(state.viewIndex + 1);
  const handleSeeFirstMove = () => {
    handleViewMove(0);
    //move the inner scroll bar to the beginning
    const moveHistoryDiv = document.getElementById("movehistory");
    moveHistoryDiv.scrollTop = 0;
  };
  const handleSeeLastMove = () => {
    handleViewMove(turnCount(state));
    //move the inner scroll bar to the end
    const moveHistoryDiv = document.getElementById("movehistory");
    moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
  };

  //===================================================
  //cosmetics logic
  //===================================================
  const handleToggleVolume = () => {
    setCookie("isVolumeOn", state.isVolumeOn ? "false" : "true", {
      path: "/",
    });
    updateState((draftState) => {
      draftState.isVolumeOn = !draftState.isVolumeOn;
    });
  };
  const handleIncreaseBoardSize = () => {
    if (state.zoomLevel < 10)
      setCookie("zoomLevel", state.zoomLevel + 1, { path: "/" });
    updateState((draftState) => {
      if (draftState.zoomLevel < 10) draftState.zoomLevel += 1;
    });
  };
  const handleDecreaseBoardSize = () => {
    if (state.zoomLevel > 0)
      setCookie("zoomLevel", state.zoomLevel - 1, { path: "/" });
    updateState((draftState) => {
      if (draftState.zoomLevel > 0) draftState.zoomLevel -= 1;
    });
  };

  //===================================================
  //browser's back arrow
  //===================================================
  const onBackButtonEvent = (e) => {
    e.preventDefault();
    handleLeaveGame();
  };
  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener("popstate", onBackButtonEvent);
    return () => window.removeEventListener("popstate", onBackButtonEvent);
  });

  //===================================================
  //preparing props for rendering
  //===================================================
  //after the game is over, the players can see how much time they
  //had left at each move. During the game, they ALWAYS see the current time
  let displayTime1, displayTime2;
  if (state.lifeCycleStage === 4) {
    [displayTime1, displayTime2] = state.moveHistory[state.viewIndex].timeLeft;
  } else {
    const tc = turnCount(state);
    [displayTime1, displayTime2] = state.moveHistory[tc].timeLeft;
  }

  let [gSize, wWidth] = isLargeScreen
    ? [globalSettings.groundSize, globalSettings.wallWidth]
    : [
        globalSettings.smallScreenGroundSize,
        globalSettings.smallScreenWallWidth,
      ];
  const scalingFactor = Math.pow(1.1, state.zoomLevel - 5);
  const scaledGroundSize = gSize * scalingFactor;
  const scaledWallWidth = wWidth * scalingFactor;
  const boardHeight =
    (scaledWallWidth * (boardDims.h - 1)) / 2 +
    (scaledGroundSize * (boardDims.h + 1)) / 2;
  const boardWidth =
    (scaledWallWidth * (boardDims.w - 1)) / 2 +
    (scaledGroundSize * (boardDims.w + 1)) / 2;

  const gapSize = isLargeScreen ? 15 : 6;
  let gridTemplateRows, gridTemplateColumns, gridTemplateAreas;
  if (isLargeScreen) {
    const timersHeight = 100;
    const controlPanelWidth = 360;
    gridTemplateRows = `${timersHeight}px ${boardHeight}px`;
    gridTemplateColumns = `${boardWidth}px ${controlPanelWidth}px`;
    gridTemplateAreas = "'timer status' 'board panel'";
  } else {
    const timersHeight = 50;
    const statusHeaderHeight = 80;
    gridTemplateRows = `${timersHeight}px ${boardHeight}px ${statusHeaderHeight}px ${boardHeight}px`;
    gridTemplateColumns = `${boardWidth}px`;
    gridTemplateAreas = "'timer' 'board' 'status' 'panel'";
  }

  return (
    <div>
      <Header
        context={state.clientRole === "Spectator" ? "Spectator" : "Player"}
        joinCode={state.joinCode}
        helpText={gameHelp}
        handleLeaveGame={handleLeaveGame}
        isLargeScreen={isLargeScreen}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        handleToggleDarkMode={handleToggleDarkMode}
        handleToggleTheme={handleToggleTheme}
      />
      <div
        style={{
          display: "grid",
          gridTemplateRows: gridTemplateRows,
          gridTemplateColumns: gridTemplateColumns,
          gridTemplateAreas: gridTemplateAreas,
          columnGap: `${gapSize}px`,
          rowGap: `${gapSize}px`,
          margin: `${gapSize}px`,
          justifyContent: "center",
          alignContent: "center",
        }}
      >
        <TimerHeader
          lifeCycleStage={state.lifeCycleStage}
          names={state.names}
          indexToMove={indexToMove(state)}
          timeLeft={[displayTime1, displayTime2]}
          isLargeScreen={isLargeScreen}
          scores={state.gameWins}
          arePlayersPresent={state.arePlayersPresent}
          menuTheme={menuTheme}
          boardTheme={boardTheme}
          isDarkModeOn={isDarkModeOn}
        />
        <StatusHeader
          lifeCycleStage={state.lifeCycleStage}
          names={state.names}
          indexToMove={indexToMove(state)}
          winner={state.winner}
          finishReason={state.finishReason}
          timeControl={state.timeControl}
          creatorStarts={state.creatorStarts}
          isLargeScreen={isLargeScreen}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn}
        />
        <Board
          creatorToMove={creatorToMove(state)}
          grid={state.moveHistory[state.viewIndex].grid}
          playerPos={state.moveHistory[state.viewIndex].playerPos}
          goals={globalSettings.goals}
          ghostAction={state.ghostAction}
          premoveActions={state.premoveActions}
          handleClick={handleBoardClick}
          groundSize={scaledGroundSize}
          wallWidth={scaledWallWidth}
          menuTheme={menuTheme}
          boardTheme={boardTheme}
          isDarkModeOn={isDarkModeOn}
          tokens={state.tokens}
        />
        <ControlPanel
          lifeCycleStage={state.lifeCycleStage}
          handleResign={handleResign}
          handleOfferDraw={handleOfferDraw}
          handleRequestTakeback={handleRequestTakeback}
          handleGiveExtraTime={handleGiveExtraTime}
          moveHistory={state.moveHistory}
          clientRole={state.clientRole}
          creatorStarts={state.creatorStarts}
          handleViewMove={handleViewMove}
          viewIndex={state.viewIndex}
          turnCount={turnCount(state)}
          handleSeeFirstMove={handleSeeFirstMove}
          handleSeePreviousMove={handleSeePreviousMove}
          handleSeeNextMove={handleSeeNextMove}
          handleSeeLastMove={handleSeeLastMove}
          handleToggleVolume={handleToggleVolume}
          isVolumeOn={state.isVolumeOn}
          handleLeaveGame={handleLeaveGame}
          menuTheme={menuTheme}
          boardTheme={boardTheme}
          isDarkModeOn={isDarkModeOn}
          handleIncreaseBoardSize={handleIncreaseBoardSize}
          handleDecreaseBoardSize={handleDecreaseBoardSize}
          zoomLevel={state.zoomLevel}
          boardHeight={boardHeight}
          isOpponentPresent={isOpponentPresent(state)}
        />
      </div>
      {state.lifeCycleStage === 4 && state.clientRole !== "Spectator" && (
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
                showToastNotification("Rematch offer sent.", 5000);
                handleSendRematchOffer();
              }}
              disabled={!isOpponentPresent(state)}
            >
              Rematch
            </Button>
          </Col>
        </Row>
      )}
      <div style={{ height: "100%" }}></div>
      <Dialog
        isOpen={state.showDrawDialog}
        title="Draw offer received"
        body="The opponent offered a draw."
        acceptButtonText="Accept"
        rejectButtonText="Decline"
        callback={handleAnswerDrawOffer}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <Dialog
        isOpen={state.showRematchDialog}
        title="Rematch offer received"
        body="The opponent would like a rematch."
        acceptButtonText="Accept"
        rejectButtonText="Decline"
        callback={handleAnswerRematchOffer}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <Dialog
        isOpen={state.showTakebackDialog}
        title="Takeback request received"
        body={
          "The opponent requested a takeback. If you accept, their " +
          "last move will be undone."
        }
        acceptButtonText="Accept"
        rejectButtonText="Decline"
        callback={handleAnswerTakebackRequest}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
    </div>
  );
};

export default GamePage;
