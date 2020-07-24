import React, { useEffect } from "react";
import cloneDeep from "lodash.clonedeep"; //probably not needed
import { useImmer } from "use-immer";

import {
  cellTypeByPos,
  posEq,
  distance,
  canBuildWall,
} from "../gameLogic/mainLogic";
import Board from "./Board";
import Header from "../shared/Header";
import StatusHeader from "./StatusHeader";
import TimerHeader from "./TimerHeader";

//===================================================
//settings that never change, so they don't need to be inside the component
//===================================================
const dims = { w: 23, h: 19 }; //traditional board size
const corners = {
  tl: { r: 0, c: 0 },
  tr: { r: 0, c: dims.w - 1 },
  bl: { r: dims.h - 1, c: 0 },
  br: { r: dims.h - 1, c: dims.w - 1 },
};
//most data structures related to the players use an array
//of length 2, with the data for the creator first
const [creatorIndex, joinerIndex] = [0, 1];
const initialPlayerPos = [corners.tl, corners.tr];
const goals = [corners.br, corners.bl];
const playerColors = ["red", "indigo"];

//===================================================
//utility functions that don't require any state
//===================================================
const creatorToMove = (turnCount, creatorStarts) =>
  turnCount % 2 === (creatorStarts ? 0 : 1);

const indexToMove = (turnCount, creatorStarts) =>
  creatorToMove(turnCount, creatorStarts) ? creatorIndex : joinerIndex;

const playerToMoveStarted = (turnCount) => turnCount % 2 === 0;

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

//function that updates the state of the game when a move happens
//(it's a bit out of context out here but it doesn't need to be inside the component)
//it applied the move number 'turnCount', consisting of the action(s) in 'actions',
//to the state 'draftState'
//'draftState' is a copy of the actual state in the GamePage component, so it can be mutated
//(see the definition of 'state' in GamePage)
//'timeLeftAfterMove' is the time left by the player who made the move
const makeMove = (draftState, actions, turnCount, timeLeftAfterMove) => {
  //only in life cycle stages 1,2,3 players can make move
  if (draftState.lifeCycleStage < 1 || draftState.lifeCycleStage > 3) return;
  //make the move only if it is the next one (safety measure against desync issues)
  if (draftState.turnCount !== turnCount - 1) return;
  const idxToMove = indexToMove(draftState.turnCount, draftState.creatorStarts);
  const otherIdx = idxToMove === creatorIndex ? joinerIndex : creatorIndex;
  for (let k = 0; k < actions.length; k++) {
    const aPos = actions[k];
    const aType = cellTypeByPos(aPos);
    if (aType === "Ground") {
      draftState.playerPos[idxToMove] = aPos;
      if (posEq(aPos, goals[idxToMove])) {
        const pToMoveStarted = playerToMoveStarted(draftState.turnCount);
        const remainingDist = distance(
          draftState.grid,
          draftState.playerPos[otherIdx],
          goals[otherIdx]
        );
        if (pToMoveStarted && remainingDist <= 2) {
          draftState.winner = "draw";
          draftState.finishReason = "goal";
          draftState.lifeCycleStage = 4;
        } else {
          draftState.winner = idxToMove === 0 ? "creator" : "joiner";
          draftState.finishReason = "goal";
          draftState.lifeCycleStage = 4;
        }
      }
    } else if (aType === "Wall") {
      draftState.grid[aPos.r][aPos.c] = idxToMove + 1;
    } else console.error("unexpected action type", aType);
  }
  if (timeLeftAfterMove) draftState.timeLeft[idxToMove] = timeLeftAfterMove;
  draftState.ghostAction = null; //ghost actions are cleared when a move actually happens
  draftState.turnCount = turnCount;
  if (draftState.lifeCycleStage === 1 && turnCount === 1)
    draftState.lifeCycleStage = 2;
  else if (draftState.lifeCycleStage === 2 && turnCount === 2)
    draftState.lifeCycleStage = 3;
};

const GamePage = ({
  socket,
  creatorParams, //timeControl and creatorName
  joinerParams, //gameId and joinerName
  returnToLobby, //call this to return to lobby
}) => {
  //===================================================
  //state that depends on the props, but is otherwise constant
  //===================================================
  const clientIsCreator = creatorParams !== null;

  //===================================================
  //state that changes over time or needs to be initialized from the server
  //===================================================
  const [state, updateState] = useImmer({
    //===================================================
    //state initialized from the props OR the server, depending on creator/joiner
    //===================================================

    //game code used by the joiner to join the game
    gameId: clientIsCreator ? null : joinerParams.gameId,
    //duration in minutes and increment in seconds
    timeControl: clientIsCreator ? creatorParams.timeControl : null,
    names: [
      clientIsCreator ? creatorParams.creatorName : null,
      clientIsCreator ? null : joinerParams.joinerName,
    ],
    creatorStarts: null, //who starts is decided by the server

    //===================================================
    //state that changes during the game and is common to both clients and synched
    //===================================================
    turnCount: 0,
    playerPos: initialPlayerPos,
    //grid contains the locations of all the built walls, labeled by who built them
    //0: empty wall, 1: player built by creator, 2: player built by joiner
    grid: emptyGrid(dims),
    timeLeft: [
      clientIsCreator ? creatorParams.timeControl.duration * 60 : null,
      clientIsCreator ? creatorParams.timeControl.duration * 60 : null,
    ],
    winner: "", //'' if game is ongoing, else 'creator', 'joiner', or 'draw'
    finishReason: "", //'' if game is ongoing, 'time' or 'goal' for a finished game

    //life cycle of the game
    //-2. Before sending 'createGame'/'joinGame' (for creator/joiner) to the server
    //-1. Before receiving 'gameCreated'/'gameJoined' (for creator/joiner) from the server
    //0. game created on server, but joiner not joined yet (only creator goes into this stage).
    //1. joiner joined, but no moves made yet. Clocks not ticking.
    //2. One player moved. Clocks still not ticking.
    //3. Both players made at least 1 move and game has not ended. Clocks are ticking.
    //4. Game ended because a win/draw condition is reached.
    lifeCycleStage: -2,

    //===================================================
    //state that changes during the game AND is unique to this client
    //===================================================
    ghostAction: null, //a single action that is shown only to this client
    //it can be combined with another action to make a full move, or undone in order to
    //choose a different action
  });

  //first contact to server
  useEffect(() => {
    //first contact only from lifecycle stage -2
    if (state.lifeCycleStage !== -2) return;
    if (clientIsCreator) {
      updateState((draftState) => {
        draftState.lifeCycleStage = -1;
      });
      socket.emit("createGame", state.timeControl, state.names[creatorIndex]);
    }
    if (!clientIsCreator) {
      updateState((draftState) => {
        draftState.lifeCycleStage = -1;
      });
      socket.emit("joinGame", state.gameId, state.names[joinerIndex]);
    }
  });

  //process server messages
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
    socket.once("gameJoined", ({ creatorStarts, creatorName, timeControl }) => {
      updateState((draftState) => {
        console.log(`game joined`);
        //if life cycle stage is already 1, it means we already joined
        if (draftState.lifeCycleStage === 1) return;
        draftState.creatorStarts = creatorStarts;
        draftState.names[creatorIndex] = creatorName;
        draftState.timeControl = timeControl;
        draftState.timeLeft = [
          timeControl.duration * 60,
          timeControl.duration * 60,
        ];
        draftState.lifeCycleStage = 1;
      });
    });
    socket.once("joinerJoined", (joinerName) => {
      updateState((draftState) => {
        //if life cycle stage is already 1, it means the joiner already joined
        if (draftState.lifeCycleStage === 1) return;
        draftState.names[joinerIndex] = joinerName;
        draftState.lifeCycleStage = 1;
      });
    });
    socket.on("move", (actions, turnCount, receivedTime) => {
      updateState((draftState) => {
        console.log(`move ${turnCount} received ${receivedTime}`);
        makeMove(draftState, actions, turnCount, receivedTime);
      });
    });
    return () => {
      socket.removeAllListeners();
    };
  }, [socket, updateState, clientIsCreator, state.gameId]);

  //timer interval to update clocks every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateState((draftState) => {
        //clocks only run after each player have made the first move, and the game has not ended
        if (draftState.lifeCycleStage !== 3) return;
        const idx = indexToMove(draftState.turnCount, draftState.creatorStarts);
        draftState.timeLeft[idx] -= 1;
        if (draftState.timeLeft[idx] === 0) {
          draftState.winner = idx === 0 ? "joiner" : "creator";
          draftState.finishReason = "time";
          draftState.lifeCycleStage = 4;
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [updateState]);

  //part of the logic of handleClick:
  //when the player selects / clicks a cell, it can trigger a different
  //number of actions (1 action: build 1 wall or move 1 step)
  //this function counts the number of actions for a clicked position
  const clickActionCount = (clickPos) => {
    const idx = indexToMove(state.turnCount, state.creatorStarts);
    const clickType = cellTypeByPos(clickPos);
    if (clickType === "Ground") {
      return distance(state.grid, state.playerPos[idx], clickPos);
    }
    if (clickType === "Wall") {
      //copy to preserve immutability of state, since we may need to modify the
      //grid / player positions to account for ghost actions
      const gridCopy = cloneDeep(state.grid);
      const playerPosCopy = cloneDeep(state.playerPos);
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

  //manage the state change on click. this may have no effect,
  //change the ghost action (which is only shown to this client),
  //or make a full move, in which case it is applied to both clients
  const handleClick = (clickPos) => {
    const thisClientToMove =
      clientIsCreator === creatorToMove(state.turnCount, state.creatorStarts);
    if (!thisClientToMove) return; //can only move if it's your turn
    if (state.lifeCycleStage < 1) return; //cannot move til player 2 joins
    if (state.lifeCycleStage > 3) return; //cannot move if game finished
    const clickType = cellTypeByPos(clickPos);

    //there's a rule that the first move by each player must be a move
    if (state.lifeCycleStage < 3 && clickType === "Wall") return;
    const actCount = clickActionCount(clickPos);
    const gType = ghostType(state.ghostAction);

    //variables to store the outcome of the click, if any.
    //in the case analysis below, if we detect that the click does
    //not trigger any change, we simply return
    //see docs/moveLogic.md for the description of the case analysis
    let [fullMoveActions, newGhostAction] = [null, null];

    if (gType === "None") {
      if (clickType === "Wall") {
        if (actCount === 1) newGhostAction = clickPos;
        else return;
      } else if (clickType === "Ground") {
        if (actCount === 1) newGhostAction = clickPos;
        else if (actCount === 2) fullMoveActions = [clickPos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (gType === "Wall") {
      if (clickType === "Wall") {
        if (posEq(state.ghostAction, clickPos)) newGhostAction = null;
        else if (actCount === 1)
          fullMoveActions = [clickPos, state.ghostAction];
        else return;
      } else if (clickType === "Ground") {
        if (actCount === 1) fullMoveActions = [clickPos, state.ghostAction];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (gType === "Ground") {
      if (clickType === "Wall") {
        if (actCount === 1) fullMoveActions = [clickPos, state.ghostAction];
        else return;
      } else if (clickType === "Ground") {
        if (actCount === 0) newGhostAction = null;
        else if (actCount === 1) {
          if (posEq(clickPos, state.ghostAction)) return;
          newGhostAction = clickPos;
        } else if (actCount === 2) fullMoveActions = [clickPos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else {
      console.error("unexpected ghost type", gType);
    }

    if (fullMoveActions) {
      const idx = indexToMove(state.turnCount, state.creatorStarts);
      let tLeft = state.timeLeft[idx];
      //we don't add the increment until the clocks start running (stage 3)
      if (state.lifeCycleStage === 3) tLeft += state.timeControl.increment;
      socket.emit("move", fullMoveActions, tLeft);
      updateState((draftState) => {
        makeMove(draftState, fullMoveActions, state.turnCount + 1, tLeft);
      });
    } else {
      updateState((draftState) => {
        draftState.ghostAction = newGhostAction;
      });
    }
  };

  const showGameHelp = () =>
    console.log("todo: show game help in modal window");

  const handleEndGame = () => {
    //tell the server to stop listening to moves for this game
    socket.emit("endGame", state.gameId);
    returnToLobby();
  };

  return (
    <div>
      <Header
        gameName={state.gameId}
        showLobby
        endGame={() => handleEndGame()}
        showHelp={showGameHelp}
      />
      <StatusHeader
        lifeCycleStage={state.lifeCycleStage}
        names={state.names}
        indexToMove={indexToMove(state.turnCount, state.creatorStarts)}
        winner={state.winner}
        finishReason={state.finishReason}
        turnCount={state.turnCount}
      />
      <TimerHeader
        lifeCycleStage={state.lifeCycleStage}
        names={state.names}
        indexToMove={indexToMove(state.turnCount, state.creatorStarts)}
        playerColors={playerColors}
        timeLeft={state.timeLeft}
      />
      <Board
        creatorToMove={creatorToMove(state.turnCount, state.creatorStarts)}
        playerColors={playerColors}
        grid={state.grid}
        playerPos={state.playerPos}
        goals={goals}
        ghostAction={state.ghostAction}
        handleClick={handleClick}
      />
    </div>
  );
};

export default GamePage;
