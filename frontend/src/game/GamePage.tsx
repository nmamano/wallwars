import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useImmer } from "use-immer";
import UIfx from "uifx";
import moveSoundAudio from "./../static/moveSound.mp3";
import showToastNotification from "../shared/showToastNotification";
import { useCookies } from "react-cookie";
import { getAiMove } from "../shared/computerAi";
import { cellSizes, maxBoardDims } from "../shared/globalSettings";
import { getPuzzle } from "./puzzles";
import {
  GameState,
  RoleEnum,
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
  ServerGame,
  FinishReason,
} from "./gameState";
import { lastPuzzleMoveIsCorrect } from "./puzzleLogic";
import Board from "./Board";
import Header from "../shared/Header";
import { BooleanDialog } from "../shared/Dialog";
import StatusHeader from "./StatusHeader";
import TimerHeader from "./TimerHeader";
import gameHelp from "./gameHelp";
import puzzleHelp from "./puzzleHelp";
import ControlPanel from "./ControlPanel";
import {
  BoardSettings,
  CellType,
  Move,
  Pos,
  TimeControl,
} from "../shared/gameLogicUtils";
import { AppState } from "../App";
import { TextButton } from "../shared/Buttons";
import socket from "../socket";

const moveSound = new UIfx(moveSoundAudio);
function playMoveSound() {
  moveSound.play();
}

export default function GamePage({
  clientParams,
  isLargeScreen,
  handleReturnToLobby,
  handleToggleDarkMode,
  handleToggleTheme,
  wasmAIGetMove,
}: {
  clientParams: AppState;
  isLargeScreen: boolean;
  handleReturnToLobby: () => void;
  handleToggleDarkMode: () => void;
  handleToggleTheme: () => void;
  wasmAIGetMove?: (s: string) => string;
}): JSX.Element {
  const { gameId, puzzleId } = useParams();
  const isPuzzleMode = puzzleId !== undefined;
  const isComputerMode = gameId === "computer";
  const isLocalMode = gameId === "local";

  const menuTheme = clientParams.menuTheme;
  const isDarkModeOn = clientParams.isDarkModeOn;

  // Cosmetic state stored between sessions.
  const [cookies, setCookie] = useCookies(["isVolumeOn", "zoomLevel"]);

  // The 'state' object contains every other piece of state.
  const [state, updateState] = useImmer<GameState>(createInitialState(cookies));

  //===================================================
  // Communication FROM the server.
  //===================================================
  useEffect(() => {
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
      }: {
        creatorName: string;
        creatorToken: string;
        timeControl: TimeControl;
        boardSettings: BoardSettings;
        creatorStarts: boolean;
        creatorPresent: boolean;
        creatorRating: number;
        joinerRating: number;
      }) => {
        updateState((draftState) => {
          applyJoinedOnServer({
            draftState,
            creatorName,
            creatorToken,
            timeControl,
            boardSettings,
            creatorStarts,
            creatorPresent,
            creatorRating,
            joinerRating,
          });
          if (
            draftState.names[0] === "Guest" ||
            draftState.names[1] === "Guest"
          ) {
            showToastNotification("Games with guests will not affect ELO.");
          }
        });
      }
    );

    socket.once("requestedGame", ({ game }: { game: ServerGame }) => {
      updateState((draftState) => {
        applyReceivedGame(draftState, game);
      });
    });

    socket.on("opponentReturned", () => {
      updateState((draftState) => {
        draftState.arePlayersPresent[
          draftState.clientRole === RoleEnum.creator ? 1 : 0
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

    socket.once(
      "joinerJoined",
      ({
        joinerName,
        joinerToken,
        joinerRating,
      }: {
        joinerName: string;
        joinerToken: string;
        joinerRating: number;
      }) => {
        updateState((draftState) => {
          if (draftState.lifeCycleStage === 1) return;
          draftState.shouldPlaySound = true;
          applyJoinerJoined({
            draftState,
            joinerName,
            joinerToken,
            joinerRating,
          });
          draftState.arePlayersPresent[1] = true;
          draftState.waitingForPing = 0;
          if (
            draftState.names[0] === "Guest" ||
            draftState.names[1] === "Guest"
          ) {
            showToastNotification("Games with guests will not affect ELO.");
          }
        });
      }
    );

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
        applyDrawGame(draftState, FinishReason.Agreement);
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
        const requesterIsCreator = draftState.clientRole === RoleEnum.creator;
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
        const playerIndex = draftState.clientRole === RoleEnum.creator ? 0 : 1;
        applyAddExtraTime(draftState, playerIndex);
        draftState.waitingForPing = 0;
      });
    });

    socket.on("resigned", () => {
      showToastNotification("The opponent resigned.", 5000);
      updateState((draftState) => {
        draftState.shouldPlaySound = true;
        const resignerIsCreator = draftState.clientRole !== RoleEnum.creator;
        applyResignGame(draftState, resignerIsCreator);
        draftState.waitingForPing = 0;
      });
    });

    socket.on(
      "moved",
      ({
        actions,
        moveIndex,
        remainingTime,
      }: {
        actions: Move;
        moveIndex: number;
        remainingTime: number;
      }) => {
        updateState((draftState) => {
          draftState.shouldPlaySound = true;
          applyMove(draftState, actions, remainingTime, moveIndex);
          draftState.waitingForPing = 0;
        });
      }
    );

    socket.on("leftGame", () => {
      updateState((draftState) => {
        draftState.arePlayersPresent[
          draftState.clientRole === RoleEnum.creator ? 1 : 0
        ] = false;
        draftState.waitingForPing = 0;
      });
    });

    socket.on("abandonedGame", () => {
      showToastNotification("The opponent abandoned the game.", 5000);
      updateState((draftState) => {
        const abandonerIsCreator =
          draftState.clientRole === RoleEnum.creator ? false : true;
        applyAbandonGame(draftState, abandonerIsCreator);
        draftState.waitingForPing = 0;
      });
    });

    socket.on(
      "newRatingsNotification",
      ({
        clientIdx,
        oldRatings,
        newRatings,
      }: {
        clientIdx: number;
        oldRatings: [number, number];
        newRatings: [number, number];
      }) => {
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
  }, [updateState, handleReturnToLobby]);

  //===================================================
  // Communication TO the server.
  //===================================================
  // First contact to server.
  useEffect(() => {
    // First contact only from lifecycle stage -2.
    if (state.lifeCycleStage !== -2) return;
    if (clientParams.clientRole === RoleEnum.creator) {
      updateState((draftState) => {
        applyAddCreator({
          draftState,
          timeControl: clientParams.timeControl,
          boardSettings: clientParams.boardSettings,
          name: clientParams.playerName,
          token: clientParams.token,
        });
        applyCreatedOnServer({
          draftState,
          joinCode: clientParams.joinCode,
          creatorStarts: clientParams.creatorStarts,
          rating: clientParams.rating,
        });
        draftState.arePlayersPresent[0] = true;
      });
    } else if (clientParams.clientRole === RoleEnum.joiner) {
      updateState((draftState) => {
        applyAddJoiner({
          draftState,
          joinCode: clientParams.joinCode,
          name: clientParams.playerName,
          token: clientParams.token,
        });
        draftState.arePlayersPresent[1] = true;
      });
      socket.emit("joinGame", {
        joinCode: clientParams.joinCode,
        token: clientParams.token,
      });
    } else if (clientParams.clientRole === RoleEnum.spectator) {
      console.log("getGame: " + clientParams.watchGameId);
      socket.emit("getGame", { gameId: clientParams.watchGameId });
    } else if (clientParams.clientRole === RoleEnum.returner) {
      updateState((draftState) => {
        applyReturnToGame(
          draftState,
          clientParams.ongoingGame!,
          clientParams.isCreator,
          clientParams.timeLeft
        );
      });
    } else if (isLocalMode) {
      updateState((draftState) => {
        applyCreatedLocally({
          draftState,
          timeControl: clientParams.timeControl,
          boardSettings: clientParams.boardSettings,
          name: clientParams.playerName,
          token: clientParams.token,
        });
        draftState.arePlayersPresent[0] = true;
        draftState.arePlayersPresent[1] = true;
      });
    } else if (isComputerMode) {
      updateState((draftState) => {
        applyCreatedVsComputer({
          draftState,
          boardSettings: clientParams.boardSettings,
          name: clientParams.playerName,
          token: clientParams.token,
        });
        draftState.arePlayersPresent[0] = true;
        draftState.arePlayersPresent[1] = true;
      });
    } else if (isPuzzleMode) {
      const puzzle = getPuzzle(puzzleId);
      if (!puzzle) {
        console.log("show toast notification: puzzle not found");
        showToastNotification("Puzzle not found.", 5000);
        handleReturnToLobby();
        return;
      }
      updateState((draftState) => {
        applyCreatedPuzzle({
          draftState,
          name: clientParams.playerName,
          token: clientParams.token,
          puzzle: puzzle,
        });
        draftState.arePlayersPresent[0] = true;
        draftState.arePlayersPresent[1] = true;
      });
    } else {
      console.error("unknown client role", clientParams.clientRole);
    }
  });

  const isOfflineMode = () => isLocalMode || isComputerMode || isPuzzleMode;
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
        if (isComputerMode) {
          // In the C++ AI, the player on the top-left always moves first.
          // So, here, we make the Creator always start.
          // Since applySetupRematch flips who starts,
          // we flip it here to negate the effect.
          draftState.creatorStarts = !draftState.creatorStarts;
        }
        applySetupRematch(draftState);
      });
    }
  };

  const handleAnswerRematchOffer = (accepted: boolean) => {
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
        applyDrawGame(draftState, FinishReason.Agreement);
      });
    }
  };

  const handleAnswerDrawOffer = (accepted: boolean) => {
    if (accepted) {
      socket.emit("acceptDraw");
      updateState((draftState) => {
        applyDrawGame(draftState, FinishReason.Agreement);
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
        if (isLocalMode) {
          // In a local game, we always undo only one ply.
          applyTakeback(draftState, !creatorToMove(draftState));
        } else if (isComputerMode) {
          // Versus the computer, we always undo the player (creator) move.
          applyTakeback(draftState, true);
        } else if (isPuzzleMode) {
          // In a puzzle, always undo two moves, except don't undo the setup moves.
          const tc = turnCount(draftState);
          if (tc <= getPuzzle(puzzleId)!.startIndex) return;
          applyTakeback(draftState, creatorToMove(draftState));
        } else {
          console.log("unreachable case");
        }
      });
    }
  };

  const handleAnswerTakebackRequest = (accepted: boolean) => {
    if (accepted) {
      showToastNotification(
        "The last move played on the board has been undone.",
        5000
      );
      socket.emit("acceptTakeback");
      updateState((draftState) => {
        const requesterIsCreator = draftState.clientRole === RoleEnum.joiner;
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
      showToastNotification("Added 60s to the opponent's clock.", 3000);
      socket.emit("giveExtraTime");
      updateState((draftState) => {
        const receiverIndex =
          draftState.clientRole === RoleEnum.creator ? 1 : 0;
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
        applyResignGame(draftState, draftState.clientRole === RoleEnum.creator);
      });
    } else {
      updateState((draftState) => {
        if (isLocalMode) {
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
  // Sound logic.
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
  // Timers logic.
  //===================================================
  // Timer interval to update clocks every second.
  useEffect(() => {
    const interval = setInterval(() => {
      updateState((draftState) => {
        applyClockTick(draftState);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [updateState]);

  //===================================================
  // Ping logic.
  //===================================================
  useEffect(() => {
    const pingInterval = 5000;
    const interval = setInterval(() => {
      if (isLocalMode || isComputerMode || isPuzzleMode) return;
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
    state.lifeCycleStage,
    state.waitingForPing,
    updateState,
    isPuzzleMode,
    isComputerMode,
    isLocalMode,
  ]);

  //===================================================
  // Game logic when a player selects a board cell.
  //===================================================
  // Manage the state change on click or keyboard press. This may
  // change the ghost action (which is only shown to this client), or
  // make a full move, in which case it is also sent to the other client.
  const handleSelectedCell = (pos: Pos) => {
    updateState((draftState) => {
      if (isLocalMode || isPuzzleMode) {
        // It is always the client's turn in local games.
        applySelectedCell(draftState, pos, true);
        return;
      }
      const clientIsCreator = draftState.clientRole === RoleEnum.creator;
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
  // Compute and play the AI move in computer mode.
  //===================================================
  useEffect(() => {
    if (!isComputerMode) return;
    if (state.lifeCycleStage < 1 || state.lifeCycleStage > 3) return;
    if (creatorToMove(state)) return;
    const moveIndex = turnCount(state) + 1;
    const playAiMove = async () => {
      await getAiMove(state, wasmAIGetMove).then((aiActions) =>
        updateState((draftState) => {
          applyMove(draftState, aiActions, 60 * 60, moveIndex);
        })
      );
    };

    // Async call in case the AI takes long to move. The player
    // is still able to premove and such.
    playAiMove().catch(console.error);
  });

  //===================================================
  // Play the right continuations in puzzle mode.
  //===================================================
  useEffect(() => {
    if (!isPuzzleMode) return;
    if (state.lifeCycleStage < 1) return;
    if (!lastPuzzleMoveIsCorrect(state, getPuzzle(puzzleId)!)) {
      console.log("show toast: suboptimal move");
      showToastNotification("Suboptimal move!");
      updateState((draftState) => {
        applyPuzzleTakeback(draftState, !creatorToMove(draftState));
      });
    } else if (state.lifeCycleStage === 4) {
      if (clientParams.idToken !== "") {
        socket.emit("solvedPuzzle", { puzzleId });
      }
      // TODO: for guests, show toast notification indicating that puzzles are
      // not saved for guests.
    } else {
      updateState((draftState) => {
        if (draftState.lifeCycleStage === 4) return;
        if (getPuzzle(puzzleId)!.playAsCreator !== creatorToMove(draftState))
          applyPuzzleMove(draftState, getPuzzle(puzzleId)!);
      });
    }
  });

  // Notify server if someone has won by reaching the goal or on time.
  // This is necessary because the server does not run its own clock
  // and does not understand the rules of the game.
  useEffect(() => {
    if (
      state.clientRole === RoleEnum.spectator ||
      isLocalMode ||
      isComputerMode ||
      isPuzzleMode
    )
      return;
    if (state.finishReason === "goal") {
      socket.emit("playerReachedGoal", { winner: state.winner });
    }
    if (state.finishReason === "time") {
      socket.emit("playerWonOnTime", { winner: state.winner });
    }
  }, [
    state.clientRole,
    state.winner,
    clientParams.clientRole,
    state.finishReason,
    isPuzzleMode,
    isComputerMode,
    isLocalMode,
  ]);

  const handleBoardClick = (clickedPos: Pos) => handleSelectedCell(clickedPos);

  //===================================================
  // Handling keyboard inputs.
  //===================================================
  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  });
  const downHandler = ({ key }: { key: string }) => {
    // Mechanism to avoid double-counting.
    if (state.isKeyPressed) return;
    updateState((draftState) => {
      draftState.isKeyPressed = true;
    });
    if (key === "m") {
      handleToggleVolume();
      return;
    }

    // If the user is not looking at the latest position,
    // or if the game is over, arrows are used to navigate.
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
    // Normal case: use arrow keys to move the player token.
    if (isPuzzleMode) {
      // Disable moving with arrow keys in puzzle mode because for some reason it
      // does not check if the moves are correct.
      return;
    }
    let p: Pos;
    if (state.ghostAction && ghostType(state.ghostAction) === CellType.ground)
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
  // Logic related to navigating through the move history.
  //===================================================
  const handleViewMove = (i: number) => {
    if (i < 0 || i > turnCount(state)) return;
    updateState((draftState) => {
      if (draftState.viewIndex === i) return;
      if (i > turnCount(draftState)) return;
      draftState.viewIndex = i;
      draftState.ghostAction = null;
      draftState.premoveActions = [];
    });
  };

  // Move the inner scroll bar on move history to the end after each move.
  useEffect(() => {
    const moveHistoryDiv = document.getElementById("movehistory")!;
    moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
  }, [state.moveHistory.length]);

  const handleSeePreviousMove = () => handleViewMove(state.viewIndex - 1);
  const handleSeeNextMove = () => handleViewMove(state.viewIndex + 1);
  const handleSeeFirstMove = () => {
    handleViewMove(0);
    // Move the inner scroll bar to the beginning.
    const moveHistoryDiv = document.getElementById("movehistory")!;
    moveHistoryDiv.scrollTop = 0;
  };
  const handleSeeLastMove = () => {
    handleViewMove(turnCount(state));
    // Move the inner scroll bar to the end.
    const moveHistoryDiv = document.getElementById("movehistory")!;
    moveHistoryDiv.scrollTop = moveHistoryDiv.scrollHeight;
  };

  //===================================================
  // Cosmetics logic.
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
  // Browser's back arrow.
  //===================================================
  const onBackButtonEvent = (e: any) => {
    e.preventDefault();
    handleLeaveGame();
  };
  useEffect(() => {
    window.history.pushState(null, "", window.location.pathname);
    window.addEventListener("popstate", onBackButtonEvent);
    return () => window.removeEventListener("popstate", onBackButtonEvent);
  });

  //===================================================
  // Prepare props for rendering.
  //===================================================
  // After the game is over, the players can see how much time they
  // had left at each move. During the game, they ALWAYS see the current time.
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

  // Scale up for boards with fewer fewer rows/columns than max board dims.
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
  // Using: groundRows * maxGroundSizeWithCurRows + wallRows * maxWallSizeWithCurRows = boardHeightWithMaxRows
  // And: maxGroundSizeWithCurRows/maxWallSizeWithCurRows = groundWallRatio
  // to isolate maxGroundSizeWithCurRows.
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
          state.clientRole === RoleEnum.spectator ? "spectator" : "player"
        }
        joinCode={state.joinCode!}
        helpText={isPuzzleMode ? puzzleHelp : gameHelp}
        handleLeaveGame={handleLeaveGame}
        isLargeScreen={isLargeScreen}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        playerName={clientParams.playerName}
        handleToggleDarkMode={handleToggleDarkMode}
        handleToggleTheme={handleToggleTheme}
        hasOngoingGame={true}
        isLoggedIn={clientParams.idToken !== ""}
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
          clientRole={state.clientRole!}
          lifeCycleStage={state.lifeCycleStage}
          names={[state.names[0]!, state.names[1]!]}
          ratings={state.ratings}
          indexToMove={indexToMove(state)}
          timeLeft={[displayTime1!, displayTime2!]}
          isLargeScreen={isLargeScreen}
          scores={state.matchScore}
          arePlayersPresent={state.arePlayersPresent}
          menuTheme={menuTheme}
          boardTheme={clientParams.boardTheme}
          isDarkModeOn={isDarkModeOn}
        />
        <StatusHeader
          lifeCycleStage={state.lifeCycleStage}
          names={[state.names[0]!, state.names[1]!]}
          indexToMove={indexToMove(state)}
          winner={state.winner}
          finishReason={state.finishReason}
          timeControl={state.timeControl!}
          creatorStarts={state.creatorStarts!}
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
          boardTheme={clientParams.boardTheme}
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
          clientRole={state.clientRole!}
          creatorStarts={state.creatorStarts!}
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
          boardTheme={clientParams.boardTheme}
          isDarkModeOn={isDarkModeOn}
          handleIncreaseBoardSize={handleIncreaseBoardSize}
          handleDecreaseBoardSize={handleDecreaseBoardSize}
          zoomLevel={state.zoomLevel}
          controlPanelHeight={controlPanelHeight}
          isOpponentPresent={isOpponentPresent(state)}
        />
      </div>
      {state.lifeCycleStage === 4 &&
        state.clientRole !== RoleEnum.spectator &&
        !isPuzzleMode && (
          <div
            style={{
              marginTop: "1rem",
              marginBottom: "2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <TextButton
              text="Rematch"
              tooltip="Ask the other player for a rematch"
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
              disabled={!isOpponentPresent(state)}
              isImportant={true}
              onClick={handleRematchButton}
            />
          </div>
        )}
      <div style={{ height: "100%" }}></div>
      <BooleanDialog
        isOpen={state.showDrawDialog}
        title="Draw offer received"
        body="The opponent offered a draw."
        acceptButtonText="Accept"
        rejectButtonText="Decline"
        callback={handleAnswerDrawOffer}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <BooleanDialog
        isOpen={state.showRematchDialog}
        title="Rematch offer received"
        body="The opponent would like a rematch."
        acceptButtonText="Accept"
        rejectButtonText="Decline"
        callback={handleAnswerRematchOffer}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <BooleanDialog
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
}
