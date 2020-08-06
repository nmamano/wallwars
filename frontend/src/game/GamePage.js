import React, { useEffect } from "react";
import { Button, Row, Col } from "react-materialize";
import cloneDeep from "lodash.clonedeep";
import { useImmer } from "use-immer";
import UIfx from "uifx";
import moveSoundAudio from "./../static/moveSound.mp3";
import showToastNotification from "../shared/showToastNotification";

import {
  cellTypeByPos,
  posEq,
  distance,
  isDistanceAtMost,
  canBuildWall,
} from "../gameLogic/mainLogic";
import Board from "./Board";
import Header from "../shared/Header";
import Dialog from "../shared/Dialog";
import StatusHeader from "./StatusHeader";
import TimerHeader from "./TimerHeader";
import GameHelp from "./GameHelp";
import ControlPanel from "./ControlPanel";

//===================================================
//settings that never change, so they don't need to be inside the component
//===================================================
const moveSound = new UIfx(moveSoundAudio);

const dims = { w: 23, h: 19 }; //traditional board size
const corners = {
  tl: { r: 0, c: 0 },
  tr: { r: 0, c: dims.w - 1 },
  bl: { r: dims.h - 1, c: 0 },
  br: { r: dims.h - 1, c: dims.w - 1 },
};
//most data structures related to the players use an array
//of length 2, with the data for the creator first
const initialPlayerPos = [corners.tl, corners.tr];
const goals = [corners.br, corners.bl];
const playerColors = ["red", "indigo"];
const groundSize = 37; //in pixels
const wallWidth = 12; //in pixels
const smallScreenGroundSize = 23;
const smallScreenWallWidth = 10;

const backgroundColors = {
  dark: "#004d40",
  light: "#009688",
};

//===================================================
//utility functions that don't require any state
//===================================================
const turnCount = (state) => state.moveHistory.length - 1;

const creatorToMove = (state) =>
  turnCount(state) % 2 === (state.creatorStarts ? 0 : 1);

const indexToMove = (state) => (creatorToMove(state) ? 0 : 1);

const emptyGrid = (dims) => {
  let grid = [];
  for (let r = 0; r < dims.h; r++) {
    grid[r] = [];
    for (let c = 0; c < dims.w; c++) grid[r][c] = 0;
  }
  return grid;
};

//one of 'None', 'Ground', 'Wall'
const ghostType = (pos) => (pos === null ? "None" : cellTypeByPos(pos));

//===================================================
//functions that modify a copy of the state
//===================================================
//they are a bit out of context here before the component, but they don't need
//to be inside. the state itself should be immutable, but we can make changes
//to the copy 'draftState'

//function that updates the state of the game when a move happens
//it applied the move number 'moveIndex', consisting of the action(s) in 'actions',
//'timeLeftAfterMove' is the time left by the player who made the move
const applyMakeMove = (draftState, actions, moveIndex, timeLeftAfterMove) => {
  //only in life cycle stages 1,2,3 players can make move
  if (draftState.lifeCycleStage < 1 || draftState.lifeCycleStage > 3) return;
  //make the move only if it is the next one (safety measure against desync issues)
  const tc = turnCount(draftState);
  if (tc !== moveIndex - 1) return;

  if (draftState.isVolumeOn) moveSound.play();

  const idxToMove = indexToMove(draftState);
  const otherIdx = idxToMove === 0 ? 1 : 0;
  const newPlayerPos = cloneDeep(draftState.moveHistory[tc].playerPos);
  const newGrid = cloneDeep(draftState.moveHistory[tc].grid);
  const newTimeLeft = cloneDeep(draftState.moveHistory[tc].timeLeft);
  const wallCounts = cloneDeep(draftState.moveHistory[tc].wallCounts);
  newTimeLeft[idxToMove] = timeLeftAfterMove;
  for (let k = 0; k < actions.length; k++) {
    const aPos = actions[k];
    const aType = cellTypeByPos(aPos);
    if (aType === "Ground") {
      newPlayerPos[idxToMove] = aPos;
      if (posEq(aPos, goals[idxToMove])) {
        const pToMoveStarted = tc % 2 === 0;
        const otherIsWithinOneMove = isDistanceAtMost(
          newGrid,
          newPlayerPos[otherIdx],
          goals[otherIdx],
          2
        );
        if (pToMoveStarted && otherIsWithinOneMove) {
          draftState.winner = "draw";
          draftState.gameWins[0] += 0.5;
          draftState.gameWins[1] += 0.5;
        } else {
          draftState.winner = idxToMove === 0 ? "creator" : "joiner";
          draftState.gameWins[idxToMove] += 1;
        }
        draftState.finishReason = "goal";
        draftState.lifeCycleStage = 4;
      }
    } else if (aType === "Wall") {
      newGrid[aPos.r][aPos.c] = idxToMove + 1;
      wallCounts[idxToMove] += 1;
    } else console.error("unexpected action type", aType);
  }
  draftState.moveHistory.push({
    index: tc + 1,
    actions: actions,
    grid: newGrid,
    playerPos: newPlayerPos,
    timeLeft: newTimeLeft,
    distances: [
      distance(newGrid, newPlayerPos[0], goals[0]),
      distance(newGrid, newPlayerPos[1], goals[1]),
    ],
    wallCounts: wallCounts,
  });

  if (draftState.lifeCycleStage === 1 && tc === 0)
    draftState.lifeCycleStage = 2;
  else if (draftState.lifeCycleStage === 2 && tc === 1)
    draftState.lifeCycleStage = 3;

  //ghost actions are cleared when a move actually happens
  draftState.ghostAction = null;

  //if the player is looking at a previous move, when a move happens
  //they are automatically switched to viewing the new move
  draftState.viewIndex = tc + 1;
};

const closeDialogs = (draftState) => {
  draftState.showRematchDialog = false;
  draftState.showDrawDialog = false;
  draftState.showTakebackDialog = false;
};
const applyDrawGame = (draftState, finishReason) => {
  if (draftState.lifeCycleStage !== 3) return;
  if (draftState.isVolumeOn) moveSound.play();
  draftState.lifeCycleStage = 4;
  draftState.winner = "draw";
  draftState.gameWins[0] += 0.5;
  draftState.gameWins[1] += 0.5;
  draftState.finishReason = finishReason;
  draftState.ghostAction = null;
  closeDialogs(draftState);
};
const applyResignGame = (draftState, resignerIsCreator) => {
  if (draftState.lifeCycleStage !== 3) return;
  draftState.lifeCycleStage = 4;
  draftState.winner = resignerIsCreator ? "joiner" : "creator";
  draftState.gameWins[resignerIsCreator ? 1 : 0] += 1;
  draftState.finishReason = "resign";
  draftState.ghostAction = null;
  closeDialogs(draftState);
};
const applyLeaveGame = (draftState, leaverIsCreator) => {
  draftState.opponentLeft = true;
  if (draftState.lifeCycleStage === 4) return;
  draftState.lifeCycleStage = 4;
  draftState.winner = leaverIsCreator ? "joiner" : "creator";
  draftState.gameWins[leaverIsCreator ? 1 : 0] += 1;
  draftState.finishReason = "disconnect";
  draftState.ghostAction = null;
  closeDialogs(draftState);
};
const applyTakeback = (draftState, requesterIsCreator) => {
  draftState.showTakebackDialog = false;
  if (draftState.lifeCycleStage !== 2 && draftState.lifeCycleStage !== 3)
    return;
  const requesterToMove = requesterIsCreator === creatorToMove(draftState);
  const numMovesToUndo = requesterToMove ? 2 : 1;
  for (let k = 0; k < numMovesToUndo; k++) draftState.moveHistory.pop();
  draftState.ghostAction = null;
  const tc = turnCount(draftState);
  draftState.viewIndex = tc;
  if (tc === 0) draftState.lifeCycleStage = 1;
  else if (tc === 1) draftState.lifeCycleStage = 2;
};
const applySetupRematch = (draftState) => {
  if (draftState.lifeCycleStage !== 4) return;
  draftState.creatorStarts = !draftState.creatorStarts;
  const newGrid = emptyGrid(dims);
  draftState.moveHistory = [
    {
      index: 0,
      actions: [],
      grid: newGrid,
      playerPos: initialPlayerPos,
      timeLeft: [
        draftState.timeControl.duration * 60,
        draftState.timeControl.duration * 60,
      ],
      distances: [
        distance(newGrid, initialPlayerPos[0], goals[0]),
        distance(newGrid, initialPlayerPos[1], goals[1]),
      ],
      wallCounts: [0, 0],
    },
  ];
  draftState.winner = "";
  draftState.finishReason = "";
  draftState.lifeCycleStage = 1;
  draftState.viewIndex = 0;
  draftState.ghostAction = null;
  closeDialogs(draftState);
};
const applyAddExtraTime = (draftState, playerIndex) => {
  if (draftState.lifeCycleStage !== 3) return;
  const tc = turnCount(draftState);
  draftState.moveHistory[tc].timeLeft[playerIndex] += 60;
};
const applyClockTick = (draftState) => {
  //clocks only run after each player have made the first move,
  //and the game has not ended
  if (draftState.lifeCycleStage !== 3) return;
  const idx = indexToMove(draftState);
  const tc = turnCount(draftState);
  draftState.moveHistory[tc].timeLeft[idx] -= 1;
  if (draftState.moveHistory[tc].timeLeft[idx] === 0) {
    draftState.winner = idx === 0 ? "joiner" : "creator";
    draftState.gameWins[idx === 0 ? 1 : 0] += 1;
    draftState.finishReason = "time";
    draftState.lifeCycleStage = 4;
    draftState.ghostAction = null;
    closeDialogs(draftState);
  }
};

const GamePage = ({
  socket,
  creatorParams, //timeControl and creatorName
  joinerParams, //gameId and joinerName
  returnToLobby, //call this to return to lobby
  isLargeScreen,
}) => {
  //===================================================
  //state that depends on the props, but is otherwise constant
  //===================================================
  const clientIsCreator = creatorParams !== null;

  //===================================================
  //'state' contains every other piece of state
  //===================================================
  const [state, updateState] = useImmer({
    //===================================================
    //state about the session (sequence of games played by rematching)
    //===================================================
    //game code used by the joiner to join the game
    gameId: clientIsCreator ? null : joinerParams.gameId,
    //duration in minutes and increment in seconds
    timeControl: clientIsCreator ? creatorParams.timeControl : null,
    names: [
      clientIsCreator ? creatorParams.creatorName : null,
      clientIsCreator ? null : joinerParams.joinerName,
    ],
    //how many games each player has won in this session (not implemented yet)
    gameWins: [0, 0],
    opponentLeft: false,

    //===================================================
    //shared state of the current game
    //===================================================
    creatorStarts: null, //who starts is decided by the server
    winner: "", //'' if game is ongoing, else 'creator', 'joiner', or 'draw'
    //'' if game is ongoing, 'goal' or agreement' if drawn,
    //'time', 'goal', 'resign', or 'disconnect' if someone won
    finishReason: "",

    //life cycle of the game
    //-2. Before sending 'createGame'/'joinGame' (for creator/joiner) to the server
    //-1. Before receiving 'gameCreated'/'gameJoined' (for creator/joiner) from the server
    //0. game created on server, but joiner not joined yet (only creator goes into this stage).
    //1. joiner joined, but no moves made yet. Clocks not ticking.
    //2. One player moved. Clocks still not ticking.
    //3. Both players made at least 1 move and game has not ended. Clocks are ticking.
    //4. Game ended because a win/draw condition is reached.
    lifeCycleStage: -2,

    moveHistory: [
      {
        index: 0,
        actions: [],
        //grid contains the locations of all the built walls, labeled by who built them
        //0: empty wall, 1: player built by creator, 2: player built by joiner
        grid: emptyGrid(dims),
        playerPos: initialPlayerPos,
        timeLeft: [
          clientIsCreator ? creatorParams.timeControl.duration * 60 : null,
          clientIsCreator ? creatorParams.timeControl.duration * 60 : null,
        ],
        distances: [
          distance(emptyGrid(dims), initialPlayerPos[0], goals[0]),
          distance(emptyGrid(dims), initialPlayerPos[1], goals[1]),
        ],
        wallCounts: [0, 0],
      },
    ],

    //===================================================
    //state unique to this client
    //===================================================
    //the ghost action is a single action that is shown only to this client
    //it can be combined with another action to make a full move, or undone
    //in order to choose a different action
    ghostAction: null,

    isVolumeOn: false,
    isDarkModeOn: false,
    showBackButtonWarning: false,
    isKeyPressed: false,
    //index of the move that the client is looking at, which may not be the last one
    viewIndex: 0,
    zoomLevel: 5, //number from 0 to 10
    //various dialogs where the player needs to make a decision
    showDrawDialog: false,
    showTakebackDialog: false,
    showRematchDialog: false,
  });

  //===================================================
  //communication FROM the server
  //===================================================
  useEffect(() => {
    socket.once("gameCreated", ({ gameId, creatorStarts }) => {
      updateState((draftState) => {
        //if life cycle stage is already 0, it means we already processed the response
        if (draftState.lifeCycleStage === 0) return;
        draftState.gameId = gameId;
        draftState.creatorStarts = creatorStarts;
        draftState.lifeCycleStage = 0;
      });
    });
    socket.once("gameJoined", ({ creatorName, timeControl, creatorStarts }) => {
      updateState((draftState) => {
        console.log(`game joined`);
        //if life cycle stage is already 1, it means we already joined
        if (draftState.lifeCycleStage === 1) return;
        draftState.creatorStarts = creatorStarts;
        draftState.names[0] = creatorName;
        draftState.timeControl = timeControl;
        draftState.moveHistory[0].timeLeft = [
          timeControl.duration * 60,
          timeControl.duration * 60,
        ];
        draftState.lifeCycleStage = 1;
      });
    });
    socket.once("gameJoinFailed", () => {
      showToastNotification(
        "There is no game with this code waiting for someone to join.",
        5000
      );
      returnToLobby();
    });
    socket.on("gameNotFoundError", () => {
      showToastNotification(
        "There was an issue on the server and we couldn't reach the other player.",
        5000
      );
    });
    socket.once("joinerJoined", ({ joinerName }) => {
      updateState((draftState) => {
        //if life cycle stage is already 1, it means the joiner already joined
        if (draftState.lifeCycleStage === 1) return;
        if (draftState.isVolumeOn) moveSound.play();
        draftState.names[1] = joinerName;
        draftState.lifeCycleStage = 1;
      });
    });

    socket.on("drawOffered", () => {
      updateState((draftState) => {
        draftState.showDrawDialog = true;
      });
    });
    socket.on("drawRejected", () => {
      showToastNotification("The opponent declined the draw offer.", 5000);
    });
    socket.on("drawAccepted", () => {
      showToastNotification("The opponent accepted the draw offer.", 5000);
      updateState((draftState) => {
        applyDrawGame(draftState, "agreement");
      });
    });
    socket.on("takebackRequested", () => {
      updateState((draftState) => {
        draftState.showTakebackDialog = true;
      });
    });
    socket.on("takebackRejected", () => {
      showToastNotification(
        "The opponent declined the takeback request.",
        5000
      );
    });
    socket.on("takebackAccepted", () => {
      showToastNotification("The opponent agreed to the takeback.", 5000);
      updateState((draftState) => {
        applyTakeback(draftState, clientIsCreator);
      });
    });
    socket.on("rematchOffered", () => {
      updateState((draftState) => {
        draftState.showRematchDialog = true;
      });
    });
    socket.on("rematchRejected", () => {
      showToastNotification("The opponent declined the rematch offer.", 5000);
    });
    socket.on("rematchAccepted", () => {
      showToastNotification("The opponent accepted the rematch offer.", 5000);
      updateState((draftState) => {
        if (draftState.isVolumeOn) moveSound.play();
        applySetupRematch(draftState);
      });
    });
    socket.on("extraTimeReceived", () => {
      showToastNotification("The opponent added 60s to your clock.", 5000);
      updateState((draftState) => {
        applyAddExtraTime(draftState, clientIsCreator ? 0 : 1);
      });
    });
    socket.on("resigned", () => {
      showToastNotification("The opponent resigned.", 5000);
      updateState((draftState) => {
        if (draftState.isVolumeOn) moveSound.play();
        applyResignGame(draftState, !clientIsCreator);
      });
    });
    socket.on("moved", ({ actions, moveIndex, remainingTime }) => {
      updateState((draftState) => {
        console.log(`move ${moveIndex} received (${remainingTime}s)`);
        applyMakeMove(draftState, actions, moveIndex, remainingTime);
      });
    });
    socket.on("leftGame", () => {
      showToastNotification("The opponent left the game.", 5000);
      updateState((draftState) => {
        applyLeaveGame(draftState, clientIsCreator ? false : true);
      });
    });
    return () => {
      socket.removeAllListeners();
    };
  }, [socket, updateState, clientIsCreator, returnToLobby]);

  //===================================================
  //communication TO the server
  //===================================================
  //first contact to server
  useEffect(() => {
    //first contact only from lifecycle stage -2
    if (state.lifeCycleStage !== -2) return;
    if (clientIsCreator) {
      updateState((draftState) => {
        draftState.lifeCycleStage = -1;
      });
      socket.emit("createGame", {
        creatorName: state.names[0],
        timeControl: state.timeControl,
      });
    }
    if (!clientIsCreator) {
      updateState((draftState) => {
        draftState.lifeCycleStage = -1;
      });
      socket.emit("joinGame", {
        gameId: state.gameId,
        joinerName: state.names[1],
      });
    }
  });

  const handleLeaveGame = () => {
    //tell the server to stop listening to events for this game
    socket.emit("leaveGame");
    //undo dark mode background change
    if (state.isDarkModeOn)
      document.body.style.backgroundColor = backgroundColors.light;
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
        applyTakeback(draftState, !clientIsCreator);
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
      applyAddExtraTime(draftState, clientIsCreator ? 1 : 0);
    });
  };
  const handleResign = () => {
    socket.emit("resign");
    updateState((draftState) => {
      applyResignGame(draftState, clientIsCreator);
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
  //game logic when a player selects a board cell
  //===================================================

  //part of the logic of handleSelectedCell:
  //when the player selects / clicks a cell, it can trigger a different
  //number of actions (1 action: build 1 wall or move 1 step)
  //this function counts the number of actions for a clicked position
  const clickActionCount = (clickPos) => {
    const idx = indexToMove(state);
    const clickType = cellTypeByPos(clickPos);
    const tc = turnCount(state);
    if (clickType === "Ground") {
      return distance(
        state.moveHistory[tc].grid,
        state.moveHistory[tc].playerPos[idx],
        clickPos
      );
    }
    if (clickType === "Wall") {
      //copy to preserve immutability of state, since we may need to modify the
      //grid / player positions to account for ghost actions
      const gridCopy = cloneDeep(state.moveHistory[tc].grid);
      const playerPosCopy = cloneDeep(state.moveHistory[tc].playerPos);
      const gType = ghostType(state.ghostAction);
      if (gType === "Wall") {
        //block ghost wall for the check
        gridCopy[state.ghostAction.r][state.ghostAction.c] = 1;
      } else if (gType === "Ground") {
        //use ghost position for the check
        playerPosCopy[idx] = state.ghostAction;
      }
      return canBuildWall(gridCopy, playerPosCopy, goals, clickPos) ? 1 : 0;
    }
    console.error("unexpected action type", clickType);
  };

  //manage the state change on click or keyboard press. this may
  //change the ghost action (which is only shown to this client), or
  //make a full move, in which case it is also sent to the other client
  const handleSelectedCell = (pos) => {
    const thisClientToMove = clientIsCreator === creatorToMove(state);
    if (!thisClientToMove) return; //can only move if it's your turn
    if (state.lifeCycleStage < 1) return; //cannot move til player 2 joins
    if (state.lifeCycleStage > 3) return; //cannot move if game finished
    //can only move if looking at current position
    if (state.viewIndex !== turnCount(state)) return;
    //out of bounds, can happen when using the keyboard
    if (pos.r < 0 || pos.r >= dims.h || pos.c < 0 || pos.c >= dims.w) return;

    const clickType = cellTypeByPos(pos);
    //there's a rule that the first move by each player must be a move
    if (state.lifeCycleStage < 3 && clickType === "Wall") return;

    const actCount = clickActionCount(pos);
    const gType = ghostType(state.ghostAction);

    //variables to store the outcome of the click, if any.
    //in the case analysis below, if we detect that the click does
    //not trigger any change, we simply return
    //see docs/moveLogic.md for the description of the case analysis
    let [fullMoveActions, newGhostAction] = [null, null];

    if (gType === "None") {
      if (clickType === "Wall") {
        if (actCount === 1) newGhostAction = pos;
        else return;
      } else if (clickType === "Ground") {
        if (actCount === 1) newGhostAction = pos;
        else if (actCount === 2) fullMoveActions = [pos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (gType === "Wall") {
      if (clickType === "Wall") {
        if (posEq(state.ghostAction, pos)) newGhostAction = null;
        else if (actCount === 1) fullMoveActions = [pos, state.ghostAction];
        else return;
      } else if (clickType === "Ground") {
        if (actCount === 1) fullMoveActions = [pos, state.ghostAction];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (gType === "Ground") {
      if (clickType === "Wall") {
        if (actCount === 1) fullMoveActions = [pos, state.ghostAction];
        else return;
      } else if (clickType === "Ground") {
        if (actCount === 0) newGhostAction = null;
        else if (actCount === 1) {
          if (posEq(pos, state.ghostAction)) return;
          newGhostAction = pos;
        } else if (actCount === 2) fullMoveActions = [pos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else {
      console.error("unexpected ghost type", gType);
    }

    if (fullMoveActions) {
      const idx = indexToMove(state);
      const tc = turnCount(state);
      let tLeft = state.moveHistory[tc].timeLeft[idx];
      //we don't add the increment until the clocks start running (stage 3)
      if (state.lifeCycleStage === 3) tLeft += state.timeControl.increment;
      socket.emit("move", { actions: fullMoveActions, remainingTime: tLeft });
      updateState((draftState) => {
        applyMakeMove(draftState, fullMoveActions, turnCount(state) + 1, tLeft);
      });
    } else {
      updateState((draftState) => {
        draftState.ghostAction = newGhostAction;
      });
    }
  };

  //notify server if someone has won on time or by reaching the goal
  useEffect(() => {
    //only the creator sends these messages to avoid duplicate
    if (!clientIsCreator) return;
    if (state.finishReason === "time") {
      socket.emit("playerWonOnTime", { winner: state.winner });
    }
    if (state.finishReason === "goal") {
      socket.emit("playerReachedGoal", { winner: state.winner });
    }
  }, [clientIsCreator, socket, state.winner, state.finishReason]);

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
      updateState((draftState) => {
        draftState.isVolumeOn = !draftState.isVolumeOn;
      });
      return;
    }

    //if the user is not looking at the latest position,
    //or if the game is over, arrows are used to navigate
    if (state.viewIndex < turnCount(state) || state.lifeCycleStage === 4) {
      if (key === "ArrowDown" || key === "ArrowRight") {
        updateState((draftState) => {
          draftState.viewIndex += 1;
        });
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
    updateState((draftState) => {
      draftState.isVolumeOn = !draftState.isVolumeOn;
    });
  };
  const handleToggleDarkMode = () => {
    updateState((draftState) => {
      draftState.isDarkModeOn = !draftState.isDarkModeOn;
      //temporary hack -- not a proper way to change the bg color
      if (draftState.isDarkModeOn)
        document.body.style.backgroundColor = backgroundColors.dark;
      else document.body.style.backgroundColor = backgroundColors.light;
    });
  };
  const handleIncreaseBoardSize = () => {
    updateState((draftState) => {
      if (draftState.zoomLevel < 10) draftState.zoomLevel += 1;
    });
  };
  const handleDecreaseBoardSize = () => {
    updateState((draftState) => {
      if (draftState.zoomLevel > 0) draftState.zoomLevel -= 1;
    });
  };

  //===================================================
  //handle browser's back arrow / history
  //===================================================
  const onBackButtonEvent = (e) => {
    e.preventDefault();
    updateState((draftState) => {
      draftState.showBackButtonWarning = true;
    });
  };
  const handleAnswerConfirmBackButton = (confirmed) => {
    if (confirmed) {
      updateState((draftState) => {
        draftState.showBackButtonWarning = false;
      });
      handleLeaveGame();
    } else {
      updateState((draftState) => {
        draftState.showBackButtonWarning = false;
      });
    }
  };
  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener("popstate", onBackButtonEvent);
    return () => window.removeEventListener("popstate", onBackButtonEvent);
  });

  //===================================================
  //preparing props for rendering
  //===================================================
  let [gSize, wWidth] = isLargeScreen
    ? [groundSize, wallWidth]
    : [smallScreenGroundSize, smallScreenWallWidth];
  const scalingFactor = Math.pow(1.1, state.zoomLevel - 5);
  const scaledGroundSize = gSize * scalingFactor;
  const scaledWallWidth = wWidth * scalingFactor;
  const boardHeight =
    (scaledWallWidth * (dims.h - 1)) / 2 +
    (scaledGroundSize * (dims.h + 1)) / 2;
  const boardWidth =
    (scaledWallWidth * (dims.w - 1)) / 2 +
    (scaledGroundSize * (dims.w + 1)) / 2;

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

  //after the game is over, the players can see how much time they
  //had left at each move. During the game, they ALWAYS see the current time
  let displayTime1, displayTime2;
  if (state.lifeCycleStage === 4) {
    [displayTime1, displayTime2] = state.moveHistory[state.viewIndex].timeLeft;
  } else {
    const tc = turnCount(state);
    [displayTime1, displayTime2] = state.moveHistory[tc].timeLeft;
  }

  //===================================================
  //rendering (dialogs only shown on occasion)
  //===================================================
  return (
    <div className={state.isDarkModeOn ? "teal darken-4" : undefined}>
      <Header
        gameName={state.gameId}
        showLobby
        endGame={handleLeaveGame}
        helpText={GameHelp()}
        isLargeScreen={isLargeScreen}
        isDarkModeOn={state.isDarkModeOn}
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
          playerColors={playerColors}
          timeLeft={[displayTime1, displayTime2]}
          isLargeScreen={isLargeScreen}
          scores={state.gameWins}
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
        />
        <Board
          creatorToMove={creatorToMove(state)}
          playerColors={playerColors}
          grid={state.moveHistory[state.viewIndex].grid}
          playerPos={state.moveHistory[state.viewIndex].playerPos}
          goals={goals}
          ghostAction={state.ghostAction}
          handleClick={handleBoardClick}
          groundSize={scaledGroundSize}
          wallWidth={scaledWallWidth}
          isDarkModeOn={state.isDarkModeOn}
        />
        <ControlPanel
          lifeCycleStage={state.lifeCycleStage}
          handleResign={handleResign}
          handleOfferDraw={handleOfferDraw}
          handleRequestTakeback={handleRequestTakeback}
          handleGiveExtraTime={handleGiveExtraTime}
          moveHistory={state.moveHistory}
          playerColors={playerColors}
          clientIsCreator={clientIsCreator}
          creatorStarts={state.creatorStarts}
          handleViewMove={handleViewMove}
          viewIndex={state.viewIndex}
          handleSeeFirstMove={handleSeeFirstMove}
          handleSeePreviousMove={handleSeePreviousMove}
          handleSeeNextMove={handleSeeNextMove}
          handleSeeLastMove={handleSeeLastMove}
          handleToggleVolume={handleToggleVolume}
          isVolumeOn={state.isVolumeOn}
          handleToggleDarkMode={handleToggleDarkMode}
          isDarkModeOn={state.isDarkModeOn}
          handleIncreaseBoardSize={handleIncreaseBoardSize}
          handleDecreaseBoardSize={handleDecreaseBoardSize}
          zoomLevel={state.zoomLevel}
          boardHeight={boardHeight}
        />
      </div>
      {state.lifeCycleStage === 4 && (
        <Row className="valign-wrapper" style={{ marginTop: "1rem" }}>
          <Col className="center" s={12}>
            <Button
              large
              className="red"
              node="button"
              waves="light"
              onClick={() => {
                showToastNotification(
                  "A rematch offer was sent to the opponent. A new game " +
                    "will start if they accept.",
                  5000
                );
                handleSendRematchOffer();
              }}
              disabled={state.opponentLeft}
            >
              Rematch
            </Button>
          </Col>
        </Row>
      )}
      <Dialog
        isOpen={state.showBackButtonWarning}
        title="Return to lobby"
        body={
          "Are you sure you want to return to the lobby? You will " +
          "not be able to rejoin this game."
        }
        acceptButtonText="Quit game"
        rejectButtonText="Stay in game"
        callback={handleAnswerConfirmBackButton}
      />
      <Dialog
        isOpen={state.showDrawDialog}
        title="Draw offer received"
        body="The opponent offered a draw."
        acceptButtonText="Accept"
        rejectButtonText="Decline"
        callback={handleAnswerDrawOffer}
      />
      <Dialog
        isOpen={state.showRematchDialog}
        title="Rematch offer received"
        body="The opponent would like a rematch."
        acceptButtonText="Accept"
        rejectButtonText="Decline"
        callback={handleAnswerRematchOffer}
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
      />
    </div>
  );
};

export default GamePage;
