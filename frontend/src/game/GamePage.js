import React, { useEffect } from "react";
import { Button, Row, Col } from "react-materialize";
import { useImmer } from "use-immer";
import UIfx from "uifx";
import moveSoundAudio from "./../static/moveSound.mp3";
import showToastNotification from "../shared/showToastNotification";
import { useCookies } from "react-cookie";
import { getAiMove } from "../shared/computerAi";
import { cellSizes, maxBoardDims } from "../shared/globalSettings";
import {
  roleEnum,
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
  applyNewRatingsNotification,
  getTracePos,
  creatorToMoveAtIndex,
  applyCreatedLocally,
  applyCreatedVsComputer,
  applyCreatedPuzzle,
  applyPuzzleMove,
  applyPuzzleTakeback,
} from "./gameState";
import { lastPuzzleMoveIsCorrect } from "./puzzleLogic";

import Board from "./Board";
import Header from "../shared/Header";
import Dialog from "../shared/Dialog";
import StatusHeader from "./StatusHeader";
import TimerHeader from "./TimerHeader";
import gameHelp from "./gameHelp";
import ControlPanel from "./ControlPanel";
import { getColor } from "../shared/colorThemes";
import { cellEnum } from "../shared/gameLogicUtils";

const moveSound = new UIfx(moveSoundAudio);
const playMoveSound = () => {
  moveSound.play();
};

const GamePage = ({
  socket,
  //clientParams contains 'clientRole' as well as other fields
  //that are needed depending on the client role
  clientParams,
  isLargeScreen,
  boardTheme,
  handleReturnToLobby,
  handleToggleDarkMode,
  handleToggleTheme,
}) => {
  const menuTheme = clientParams.menuTheme;
  const isDarkModeOn = clientParams.isDarkModeOn;

  //cosmetic state stored between sessions
  const [cookies, setCookie] = useCookies(["isVolumeOn", "zoomLevel"]);

  //the 'state' object contains every other piece of state
  const [state, updateState] = useImmer(createInitialState(cookies));

  //===================================================
  //communication FROM the server
  //===================================================
  useEffect(() => {
    socket.once("gameCreated", ({ joinCode, creatorStarts, rating }) => {
      updateState((draftState) => {
        applyCreatedOnServer(draftState, joinCode, creatorStarts, rating);
      });
    });
    socket.once(
      "gameJoined",
      ({
        creatorName,
        creatorToken,
        timeControl,
        boardSettings,
        creatorStarts,
        creatorPresent,
        creatorRating,
        joinerRating,
      }) => {
        updateState((draftState) => {
          applyJoinedOnServer(
            draftState,
            creatorName,
            creatorToken,
            timeControl,
            boardSettings,
            creatorStarts,
            creatorPresent,
            creatorRating,
            joinerRating
          );
        });
      }
    );
    socket.once("requestedGame", ({ game }) => {
      updateState((draftState) => {
        applyReceivedGame(draftState, game);
      });
    });
    socket.on(
      "returnedToOngoingGame",
      ({ ongoingGame, isCreator, timeLeft }) => {
        updateState((draftState) => {
          applyReturnToGame(draftState, ongoingGame, isCreator, timeLeft);
          draftState.waitingForPing = 0;
        });
      }
    );
    socket.on("opponentReturned", () => {
      updateState((draftState) => {
        draftState.arePlayersPresent[
          draftState.clientRole === roleEnum.creator ? 1 : 0
        ] = true;
        draftState.waitingForPing = 0;
      });
    });
    socket.on("ongoingGameNotFound", () => {
      showToastNotification("Couldn't find the game anymore.", 5000);
      handleReturnToLobby();
    });
    socket.on("gameJoinFailed", () => {
      showToastNotification(
        "There is no game with this code waiting for someone to join.",
        5000
      );
      handleReturnToLobby();
    });
    socket.on("invalidEloIdError", () => {
      showToastNotification("This ELO id is not valid.", 5000);
      handleReturnToLobby();
    });
    socket.on("joinSelfGameFailed", () => {
      showToastNotification(
        "You cannot play against yourself. To play as both sides from the same browser, play one of the sides from an Incognito window.",
        12000
      );
      handleReturnToLobby();
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
    socket.once("joinerJoined", ({ joinerName, joinerToken, joinerRating }) => {
      updateState((draftState) => {
        if (draftState.lifeCycleStage === 1) return;
        draftState.shouldPlaySound = true;
        applyJoinerJoined(draftState, joinerName, joinerToken, joinerRating);
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
        const requesterIsCreator = draftState.clientRole === roleEnum.creator;
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
        draftState.shouldPlaySound = true;
        applySetupRematch(draftState);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("extraTimeReceived", () => {
      showToastNotification("The opponent added 60s to your clock.", 5000);
      updateState((draftState) => {
        const playerIndex = draftState.clientRole === roleEnum.creator ? 0 : 1;
        applyAddExtraTime(draftState, playerIndex);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("resigned", () => {
      showToastNotification("The opponent resigned.", 5000);
      updateState((draftState) => {
        draftState.shouldPlaySound = true;
        const resignerIsCreator = draftState.clientRole !== roleEnum.creator;
        applyResignGame(draftState, resignerIsCreator);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("moved", ({ actions, moveIndex, remainingTime }) => {
      updateState((draftState) => {
        draftState.shouldPlaySound = true;
        applyMove(draftState, actions, remainingTime, moveIndex);
        draftState.waitingForPing = 0;
      });
    });
    socket.on("leftGame", () => {
      updateState((draftState) => {
        draftState.arePlayersPresent[
          draftState.clientRole === roleEnum.creator ? 1 : 0
        ] = false;
        draftState.waitingForPing = 0;
      });
    });
    socket.on("abandonedGame", () => {
      showToastNotification("The opponent abandoned the game.", 5000);
      updateState((draftState) => {
        const abandonerIsCreator =
          draftState.clientRole === roleEnum.creator ? false : true;
        applyAbandonGame(draftState, abandonerIsCreator);
        draftState.waitingForPing = 0;
      });
    });
    socket.on(
      "newRatingsNotification",
      ({ clientIdx, oldRatings, newRatings }) => {
        const oldRating = Math.round(oldRatings[clientIdx]);
        const newRating = Math.round(newRatings[clientIdx]);
        const ratingDelta = newRating - oldRating;
        const ratingDeltaStr =
          ratingDelta >= 0 ? `+ ${ratingDelta}` : `- ${-ratingDelta}`;
        const notificationStr = `New rating: ${oldRating} ${ratingDeltaStr} = ${newRating}`;
        showToastNotification(notificationStr, 10000);
        updateState((draftState) => {
          applyNewRatingsNotification(draftState, newRatings);
          draftState.waitingForPing = 0;
        });
      }
    );
    socket.on("pongFromServer", () => {
      updateState((draftState) => {
        draftState.waitingForPing = 0;
      });
    });
    return () => {
      socket.removeAllListeners();
    };
  }, [socket, updateState, handleReturnToLobby]);

  //===================================================
  //communication TO the server
  //===================================================
  //first contact to server
  useEffect(() => {
    //first contact only from lifecycle stage -2
    if (state.lifeCycleStage !== -2) return;
    if (clientParams.clientRole === roleEnum.creator) {
      updateState((draftState) => {
        applyAddCreator(
          draftState,
          clientParams.timeControl,
          clientParams.boardSettings,
          clientParams.playerName,
          clientParams.token
        );
        draftState.arePlayersPresent[0] = true;
      });
      socket.emit("createGame", {
        name: clientParams.playerName,
        token: clientParams.token,
        timeControl: clientParams.timeControl,
        boardSettings: clientParams.boardSettings,
        eloId: clientParams.eloId,
        isPublic: !clientParams.isPrivate,
      });
    } else if (clientParams.clientRole === roleEnum.joiner) {
      updateState((draftState) => {
        applyAddJoiner(
          draftState,
          clientParams.joinCode,
          clientParams.playerName,
          clientParams.token
        );
        draftState.arePlayersPresent[1] = true;
      });
      socket.emit("joinGame", {
        joinCode: clientParams.joinCode,
        name: clientParams.playerName,
        token: clientParams.token,
        eloId: clientParams.eloId,
      });
    } else if (clientParams.clientRole === roleEnum.spectator) {
      socket.emit("getGame", { gameId: clientParams.watchGameId });
    } else if (clientParams.clientRole === roleEnum.returner) {
      socket.emit("returnToOngoingGame", { eloId: clientParams.eloId });
    } else if (clientParams.clientRole === roleEnum.offline) {
      updateState((draftState) => {
        applyCreatedLocally(
          draftState,
          clientParams.timeControl,
          clientParams.boardSettings,
          clientParams.playerName,
          clientParams.token
        );
        draftState.arePlayersPresent[0] = true;
        draftState.arePlayersPresent[1] = true;
      });
    } else if (clientParams.clientRole === roleEnum.computer) {
      updateState((draftState) => {
        applyCreatedVsComputer(
          draftState,
          clientParams.boardSettings,
          clientParams.playerName,
          clientParams.token
        );
        draftState.arePlayersPresent[0] = true;
        draftState.arePlayersPresent[1] = true;
      });
    } else if (clientParams.clientRole === roleEnum.puzzle) {
      updateState((draftState) => {
        applyCreatedPuzzle(
          draftState,
          clientParams.playerName,
          clientParams.token,
          clientParams.puzzle
        );
        draftState.arePlayersPresent[0] = true;
        draftState.arePlayersPresent[1] = true;
      });
    } else {
      console.error("unknown client role", clientParams.clientRole);
    }
  });

  const isOfflineMode = () =>
    clientParams.clientRole === roleEnum.offline ||
    clientParams.clientRole === roleEnum.computer ||
    clientParams.clientRole === roleEnum.puzzle;
  const isOnlineMode = () => !isOfflineMode();

  const handleLeaveGame = () => {
    if (isOnlineMode()) socket.emit("leaveGame");
    handleReturnToLobby();
  };
  const handleRematchButton = () => {
    if (isOnlineMode()) {
      showToastNotification("Rematch offer sent.", 5000);
      socket.emit("offerRematch");
    } else {
      updateState((draftState) => {
        draftState.shouldPlaySound = true;
        applySetupRematch(draftState);
      });
    }
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
    if (isOnlineMode()) {
      socket.emit("offerDraw");
    } else {
      updateState((draftState) => {
        applyDrawGame(draftState, "agreement");
      });
    }
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
    if (isOnlineMode()) {
      showToastNotification(
        "A takeback request was sent to the opponent.",
        5000
      );
      socket.emit("requestTakeback");
    } else {
      updateState((draftState) => {
        if (clientParams.clientRole === roleEnum.offline) {
          // In a local game, we always undo only one ply.
          applyTakeback(draftState, !creatorToMove(draftState));
        } else if (clientParams.clientRole === roleEnum.computer) {
          // Vs the computer, we always undo the player (creator) move
          applyTakeback(draftState, true);
        } else {
          // In a puzzle, always undo two moves, except don't undo the setup moves.
          const tc = turnCount(draftState);
          if (tc <= clientParams.puzzle.startIndex) return;
          applyTakeback(draftState, creatorToMove(draftState));
        }
      });
    }
  };
  const handleAnswerTakebackRequest = (accepted) => {
    if (accepted) {
      showToastNotification(
        "The last move played on the board has been undone.",
        5000
      );
      socket.emit("acceptTakeback");
      updateState((draftState) => {
        const requesterIsCreator = draftState.clientRole === roleEnum.joiner;
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
    if (isOnlineMode()) {
      showToastNotification("You added 60s to the opponent's clock.", 5000);
      socket.emit("giveExtraTime");
      updateState((draftState) => {
        const receiverIndex =
          draftState.clientRole === roleEnum.creator ? 1 : 0;
        applyAddExtraTime(draftState, receiverIndex);
      });
    } else {
      updateState((draftState) => {
        // In offline mode, the player to move gets extra time.
        applyAddExtraTime(draftState, creatorToMove(draftState) ? 0 : 1);
      });
    }
  };
  const handleResign = () => {
    if (isOnlineMode()) {
      socket.emit("resign");
      updateState((draftState) => {
        applyResignGame(draftState, draftState.clientRole === roleEnum.creator);
      });
    } else {
      updateState((draftState) => {
        if (clientParams.clientRole === roleEnum.offline) {
          // In local games, the player that resigns is the one to move.
          applyResignGame(draftState, creatorToMove(draftState));
        } else {
          // Versus the computer, only the human can resign.
          applyResignGame(draftState, true);
        }
      });
    }
  };

  //===================================================
  //sound logic
  //===================================================
  useEffect(() => {
    if (state.isVolumeOn && state.shouldPlaySound) {
      playMoveSound();
      updateState((draftState) => {
        draftState.shouldPlaySound = false;
      });
    }
  }, [updateState, state.isVolumeOn, state.shouldPlaySound]);

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
      if (
        clientParams.clientRole === roleEnum.offline ||
        clientParams.clientRole === roleEnum.computer ||
        clientParams.clientRole === roleEnum.puzzle
      )
        return;
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
  }, [
    socket,
    state.lifeCycleStage,
    state.waitingForPing,
    clientParams.clientRole,
    updateState,
  ]);

  //===================================================
  //game logic when a player selects a board cell
  //===================================================
  //manage the state change on click or keyboard press. this may
  //change the ghost action (which is only shown to this client), or
  //make a full move, in which case it is also sent to the other client
  const handleSelectedCell = (pos) => {
    updateState((draftState) => {
      if (
        clientParams.clientRole === roleEnum.offline ||
        clientParams.clientRole === roleEnum.puzzle
      ) {
        // It is always the client's turn in local games.
        applySelectedCell(draftState, pos, true);
        return;
      }
      const clientIsCreator = draftState.clientRole === roleEnum.creator;
      const clientToMove = creatorToMove(draftState) === clientIsCreator;
      applySelectedCell(draftState, pos, clientToMove);
    });
  };

  useEffect(() => {
    if (state.moveToSend) {
      if (isOfflineMode()) return;
      socket.emit("move", state.moveToSend);
      updateState((draftState) => {
        draftState.moveToSend = null;
      });
    }
  });

  //===================================================
  //compute and play the AI move in computer mode
  //===================================================
  useEffect(() => {
    if (clientParams.clientRole !== roleEnum.computer) return;
    if (state.lifeCycleStage < 1 || state.lifeCycleStage > 3) return;
    if (creatorToMove(state)) return;
    const moveIndex = turnCount(state) + 1;
    // Async. call in case the AI takes long to move. The player
    // is still able to premove and such.
    getAiMove(state).then((aiActions) =>
      updateState((draftState) => {
        applyMove(draftState, aiActions, 60 * 60, moveIndex);
      })
    );
  });

  //===================================================
  //play right continuations in puzzle mode
  //===================================================
  useEffect(() => {
    if (clientParams.clientRole !== roleEnum.puzzle) return;
    if (state.lifeCycleStage < 1) return;
    if (!lastPuzzleMoveIsCorrect(state, clientParams.puzzle)) {
      showToastNotification("Suboptimal move!");
      updateState((draftState) => {
        applyPuzzleTakeback(draftState, !creatorToMove(draftState));
      });
    } else if (state.lifeCycleStage === 4) {
      socket.emit("solvedPuzzle", {
        eloId: clientParams.eloId,
        name: state.names[clientParams.puzzle.playAsCreator ? 0 : 1],
        puzzleId: clientParams.puzzle.id,
      });
    } else {
      updateState((draftState) => {
        if (draftState.lifeCycleStage === 4) return;
        if (clientParams.puzzle.playAsCreator !== creatorToMove(draftState))
          applyPuzzleMove(draftState, clientParams.puzzle);
      });
    }
  });

  //notify server if someone has won by reaching the goal or on time
  //this is necessary because the server does not run its own clock
  //and does not understand the rules of the game
  useEffect(() => {
    if (
      state.clientRole === roleEnum.spectator ||
      clientParams.clientRole === roleEnum.offline ||
      clientParams.clientRole === roleEnum.computer ||
      clientParams.clientRole === roleEnum.puzzle
    )
      return;
    if (state.finishReason === "goal") {
      socket.emit("playerReachedGoal", { winner: state.winner });
    }
    if (state.finishReason === "time") {
      socket.emit("playerWonOnTime", { winner: state.winner });
    }
  }, [
    socket,
    state.clientRole,
    state.winner,
    clientParams.clientRole,
    state.finishReason,
  ]);

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
            draftState.viewIndex++;
          });
        }
      } else if (key === "ArrowUp" || key === "ArrowLeft") {
        if (state.viewIndex > 0) {
          updateState((draftState) => {
            draftState.viewIndex--;
          });
        }
      }
      return;
    }
    //normal case: use arrow keys to move the player token
    if (clientParams.clientRole === roleEnum.puzzle) {
      // disable moving with arrow keys in puzzle mode because for some reason it
      // does not check if the moves are correct.
      return;
    }
    let p;
    if (state.ghostAction && ghostType(state.ghostAction) === cellEnum.ground)
      p = state.ghostAction;
    else {
      const tc = turnCount(state);
      p = state.moveHistory[tc].playerPos[indexToMove(state)];
    }
    if (key === "ArrowDown") p = [p[0] + 2, p[1]];
    else if (key === "ArrowUp") p = [p[0] - 2, p[1]];
    else if (key === "ArrowLeft") p = [p[0], p[1] - 2];
    else if (key === "ArrowRight") p = [p[0], p[1] + 2];
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
      draftState.premoveActions = [];
    });
  };

  //move the inner scroll bar on move history to the end after each move
  useEffect(() => {
    const moveHistoryDiv = document.getElementById("movehistory");
    moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
  }, [state.moveHistory.length]);

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
      if (draftState.zoomLevel < 10) draftState.zoomLevel++;
    });
  };
  const handleDecreaseBoardSize = () => {
    if (state.zoomLevel > 0)
      setCookie("zoomLevel", state.zoomLevel - 1, { path: "/" });
    updateState((draftState) => {
      if (draftState.zoomLevel > 0) draftState.zoomLevel--;
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
    ? [cellSizes.groundSize, cellSizes.wallWidth]
    : [cellSizes.smallScreenGroundSize, cellSizes.smallScreenWallWidth];

  const scalingFactor = Math.pow(1.1, state.zoomLevel - 5);
  const scaledGroundSize = gSize * scalingFactor;
  const scaledWallWidth = wWidth * scalingFactor;
  const groundWallRatio = gSize / wWidth;

  //scale up for boards with fewer fewer rows/columns than max board dims
  const maxGroundRows = (maxBoardDims[0] + 1) / 2;
  const maxGroundCols = (maxBoardDims[1] + 1) / 2;
  const maxWallRows = (maxBoardDims[0] - 1) / 2;
  const maxWallCols = (maxBoardDims[1] - 1) / 2;
  const groundRows = (state.boardSettings.dims[0] + 1) / 2;
  const groundCols = (state.boardSettings.dims[1] + 1) / 2;
  const wallRows = (state.boardSettings.dims[0] - 1) / 2;
  const wallCols = (state.boardSettings.dims[1] - 1) / 2;
  const boardHeightWithMaxRows =
    scaledWallWidth * maxWallRows + scaledGroundSize * maxGroundRows;
  const boardWidthWithMaxCols =
    scaledWallWidth * maxWallCols + scaledGroundSize * maxGroundCols;
  //using: groundRows * maxGroundSizeWithCurRows + wallRows * maxWallSizeWithCurRows = boardHeightWithMaxRows
  //and: maxGroundSizeWithCurRows/maxWallSizeWithCurRows = groundWallRatio
  //to isolate maxGroundSizeWithCurRows
  const maxGroundSizeWithCurRows =
    boardHeightWithMaxRows / (groundRows + wallRows / groundWallRatio);
  const maxGroundSizeWithCurCols =
    boardWidthWithMaxCols / (groundCols + wallCols / groundWallRatio);
  const newScaledGroundSize = Math.min(
    maxGroundSizeWithCurRows,
    maxGroundSizeWithCurCols
  );
  const newScaledWallWidth = newScaledGroundSize / groundWallRatio;
  const boardHeight =
    newScaledWallWidth * wallRows + newScaledGroundSize * groundRows;
  const boardWidth =
    newScaledWallWidth * wallCols + newScaledGroundSize * groundCols;
  const gapSize = isLargeScreen ? 15 : 6;
  const controlPanelWidth = 360;
  const controlPanelHeight = Math.max(boardHeight, 360);
  let gridTemplateRows, gridTemplateColumns, gridTemplateAreas;
  if (isLargeScreen) {
    const timersHeight = 100;
    const timersWidth = Math.max(boardWidth, 560);
    gridTemplateAreas = "'timer status' 'board panel'";
    gridTemplateRows = `${timersHeight}px ${controlPanelHeight}px`;
    gridTemplateColumns = `${timersWidth}px ${controlPanelWidth}px`;
  } else {
    const timersHeight = 50;
    const statusHeaderHeight = 80;
    gridTemplateAreas = "'timer' 'board' 'status' 'panel'";
    gridTemplateRows = `${timersHeight}px ${boardHeight}px ${statusHeaderHeight}px ${controlPanelHeight}px`;
    gridTemplateColumns = `${boardWidthWithMaxCols}px`;
  }

  const playerPos = state.moveHistory[state.viewIndex].playerPos;
  const tracePos = getTracePos(state);
  const lastActions =
    state.viewIndex > 0 ? state.moveHistory[state.viewIndex].actions : [];

  return (
    <div>
      <Header
        context={
          state.clientRole === roleEnum.spectator ? "spectator" : "player"
        }
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
          ratings={state.ratings}
          indexToMove={indexToMove(state)}
          timeLeft={[displayTime1, displayTime2]}
          isLargeScreen={isLargeScreen}
          scores={state.matchScore}
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
          creatorToMove={creatorToMoveAtIndex(state)}
          grid={state.moveHistory[state.viewIndex].grid}
          playerPos={playerPos}
          goals={state.boardSettings.goalPos}
          ghostAction={state.ghostAction}
          premoveActions={state.premoveActions}
          lastActions={lastActions}
          tracePos={tracePos}
          handleClick={handleBoardClick}
          groundSize={newScaledGroundSize}
          wallWidth={newScaledWallWidth}
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
          controlPanelHeight={controlPanelHeight}
          isOpponentPresent={isOpponentPresent(state)}
        />
      </div>
      {state.lifeCycleStage === 4 &&
        state.clientRole !== roleEnum.spectator &&
        clientParams.clientRole !== roleEnum.puzzle && (
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
                onClick={handleRematchButton}
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
