import React, { useEffect } from "react";
import { Button, Row, Col, Modal } from "react-materialize";
import cloneDeep from "lodash.clonedeep";
import { useImmer } from "use-immer";
import UIfx from "uifx";
import moveSoundAudio from "./../static/moveSound.mp3";

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
const [creatorIndex, joinerIndex] = [0, 1];
const initialPlayerPos = [corners.tl, corners.tr];
const goals = [corners.br, corners.bl];
const playerColors = ["red", "indigo"];

//===================================================
//utility functions that don't require any state
//===================================================
const turnCount = (state) => state.moveHistory.length - 1;

const creatorToMove = (state) =>
  turnCount(state) % 2 === (state.creatorStarts ? 0 : 1);

const indexToMove = (state) =>
  creatorToMove(state) ? creatorIndex : joinerIndex;

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
//(it's a bit out of context out here, but it doesn't need to be inside the component)
//it applied the move number 'moveIndex', consisting of the action(s) in 'actions',
//to the state 'draftState'
//'draftState' is a copy of the actual state in the GamePage component, so it can be mutated
//(see the definition of 'state' in GamePage)
//'timeLeftAfterMove' is the time left by the player who made the move
const makeMove = (
  draftState,
  actions,
  moveIndex,
  timeLeftAfterMove,
  isVolumeOn
) => {
  //only in life cycle stages 1,2,3 players can make move
  if (draftState.lifeCycleStage < 1 || draftState.lifeCycleStage > 3) return;
  //make the move only if it is the next one (safety measure against desync issues)
  const tc = turnCount(draftState);
  if (tc !== moveIndex - 1) return;

  if (isVolumeOn) moveSound.play();

  const idxToMove = indexToMove(draftState);
  const otherIdx = idxToMove === creatorIndex ? joinerIndex : creatorIndex;
  let wallCount = 0;
  for (let k = 0; k < actions.length; k++) {
    const aPos = actions[k];
    const aType = cellTypeByPos(aPos);
    if (aType === "Ground") {
      draftState.playerPos[idxToMove] = aPos;
      if (posEq(aPos, goals[idxToMove])) {
        const pToMoveStarted = tc % 2 === 0;
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
      wallCount += 1;
    } else console.error("unexpected action type", aType);
  }
  if (timeLeftAfterMove) draftState.timeLeft[idxToMove] = timeLeftAfterMove;
  draftState.ghostAction = null; //ghost actions are cleared when a move actually happens
  const wallCounts = cloneDeep(draftState.moveHistory[tc].wallCounts);
  wallCounts[idxToMove] += wallCount;
  draftState.moveHistory.push({
    index: tc + 1,
    actions: actions,
    grid: draftState.grid,
    playerPos: draftState.playerPos,
    timeLeft: draftState.timeLeft,
    distances: [
      distance(draftState.grid, draftState.playerPos[0], goals[0]),
      distance(draftState.grid, draftState.playerPos[1], goals[1]),
    ],
    wallCounts: wallCounts,
  });
  if (draftState.lifeCycleStage === 1 && tc === 0)
    draftState.lifeCycleStage = 2;
  else if (draftState.lifeCycleStage === 2 && tc === 1)
    draftState.lifeCycleStage = 3;

  //if the player is looking at a previous move, when a move happens
  //they are automatically switched to viewing the new move
  draftState.viewIndex = tc + 1;
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
  //'state' contains every other piece of state
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
    playerPos: initialPlayerPos,
    //grid contains the locations of all the built walls, labeled by who built them
    //0: empty wall, 1: player built by creator, 2: player built by joiner
    grid: emptyGrid(dims),
    timeLeft: [
      clientIsCreator ? creatorParams.timeControl.duration * 60 : null,
      clientIsCreator ? creatorParams.timeControl.duration * 60 : null,
    ],
    winner: "", //'' if game is ongoing, else 'creator', 'joiner', or 'draw'
    finishReason: "", //'' if game is ongoing, else 'time', 'goal', or 'resign'

    moveHistory: [
      {
        index: 0,
        actions: [],
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
    //the ghost action is a single action that is shown only to this client
    //it can be combined with another action to make a full move, or undone in order to
    //choose a different action
    ghostAction: null,

    isVolumeOn: false,
    isDarkModeOn: false,
    showBackButtonWarning: false,
    isKeyPressed: false,
    //index of the move that the client is looking at, which may not be the last one
    viewIndex: 0,
    cellSize: 37, //in pixels
    wallWidth: 12, //in pixels
  });

  //handle browser back arrow
  const onBackButtonEvent = (e) => {
    e.preventDefault();
    updateState((draftState) => {
      draftState.showBackButtonWarning = true;
    });
  };
  const handleConfirmBackButton = () => {
    updateState((draftState) => {
      draftState.showBackButtonWarning = false;
    });
    handleEndSession();
  };
  const handleCancelBackButton = () => {
    updateState((draftState) => {
      draftState.showBackButtonWarning = false;
    });
  };
  useEffect(() => {
    window.history.pushState(null, null, window.location.pathname);
    window.addEventListener("popstate", onBackButtonEvent);
    return () => window.removeEventListener("popstate", onBackButtonEvent);
  });

  const handleToggleVolume = () => {
    updateState((draftState) => {
      draftState.isVolumeOn = !draftState.isVolumeOn;
    });
  };
  const handleToggleDarkMode = () => {
    updateState((draftState) => {
      draftState.isDarkModeOn = !draftState.isDarkModeOn;
    });
  };

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
        draftState.moveHistory[0].timeLeft = [
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
    socket.on("rematchStarted", (gameId) => {
      console.log("rematch started");
      updateState((draftState) => {
        draftState.gameId = gameId;
        draftState.creatorStarts = !draftState.creatorStarts;
        draftState.playerPos = initialPlayerPos;
        draftState.grid = emptyGrid(dims);
        draftState.timeLeft = [
          draftState.timeControl.duration * 60,
          draftState.timeControl.duration * 60,
        ];
        draftState.moveHistory = [
          {
            index: 0,
            actions: [],
            grid: emptyGrid(dims),
            playerPos: initialPlayerPos,
            timeLeft: [
              draftState.timeControl.duration * 60,
              draftState.timeControl.duration * 60,
            ],
            distances: [
              distance(emptyGrid(dims), initialPlayerPos[0], goals[0]),
              distance(emptyGrid(dims), initialPlayerPos[1], goals[1]),
            ],
            wallCounts: [0, 0],
          },
        ];
        draftState.winner = "";
        draftState.finishReason = "";
        draftState.lifeCycleStage = 1;
        draftState.viewIndex = 0;
        draftState.ghostAction = null;
      });
    });
    socket.on("playerResigned", (resignerIsCreator) => {
      updateState((draftState) => {
        draftState.lifeCycleStage = 4;
        draftState.winner = resignerIsCreator ? "joiner" : "creator";
        draftState.finishReason = "resign";
      });
    });
    socket.on("move", (actions, moveIndex, receivedTime) => {
      updateState((draftState) => {
        console.log(`move ${moveIndex} received ${receivedTime}`);
        makeMove(
          draftState,
          actions,
          moveIndex,
          receivedTime,
          state.isVolumeOn
        );
      });
    });
    return () => {
      socket.removeAllListeners();
    };
  }, [socket, updateState, clientIsCreator, state.gameId, state.isVolumeOn]);

  //timer interval to update clocks every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateState((draftState) => {
        //clocks only run after each player have made the first move, and the game has not ended
        if (draftState.lifeCycleStage !== 3) return;
        const idx = indexToMove(draftState);
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

  //part of the logic of handleSelectedPosition:
  //when the player selects / clicks a cell, it can trigger a different
  //number of actions (1 action: build 1 wall or move 1 step)
  //this function counts the number of actions for a clicked position
  const clickActionCount = (clickPos) => {
    const idx = indexToMove(state);
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

  //manage the state change on click or keyboard press. this may
  //change the ghost action (which is only shown to this client),
  //or make a full move, in which case it is applied to both clients
  const handleSelectedPosition = (pos) => {
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
      let tLeft = state.timeLeft[idx];
      //we don't add the increment until the clocks start running (stage 3)
      if (state.lifeCycleStage === 3) tLeft += state.timeControl.increment;
      socket.emit("move", fullMoveActions, tLeft);
      updateState((draftState) => {
        makeMove(
          draftState,
          fullMoveActions,
          turnCount(state) + 1,
          tLeft,
          state.isVolumeOn
        );
      });
    } else {
      updateState((draftState) => {
        draftState.ghostAction = newGhostAction;
      });
    }
  };

  const handleClick = (clickedPos) => handleSelectedPosition(clickedPos);

  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    window.addEventListener("keyup", upHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
      window.removeEventListener("keyup", upHandler);
    };
  });

  const downHandler = ({ key }) => {
    if (state.isKeyPressed) return;
    updateState((draftState) => {
      draftState.isKeyPressed = true;
    });

    if (state.viewIndex < turnCount(state)) {
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
    } else {
      let p;
      if (state.ghostAction && ghostType(state.ghostAction) === "Ground")
        p = state.ghostAction;
      else p = state.playerPos[indexToMove(state)];
      if (key === "ArrowDown") p = { r: p.r + 2, c: p.c };
      else if (key === "ArrowUp") p = { r: p.r - 2, c: p.c };
      else if (key === "ArrowLeft") p = { r: p.r, c: p.c - 2 };
      else if (key === "ArrowRight") p = { r: p.r, c: p.c + 2 };
      else return;
      handleSelectedPosition(p);
    }
  };
  const upHandler = () => {
    updateState((draftState) => {
      draftState.isKeyPressed = false;
    });
  };

  const handleEndSession = () => {
    //tell the server to stop listening to moves for this game
    socket.emit("endGame", state.gameId);
    returnToLobby();
  };
  const handleRematch = () => {
    socket.emit("rematch", state.gameId);
  };
  const handleOfferDraw = () => {};
  const handleProposeTakeback = () => {};
  const handleResign = () => {
    socket.emit("resign", state.gameId);
  };
  const handleIncreaseOpponentTime = () => {};

  const handleViewMove = (i) => {
    if (i < 0 || i > turnCount(state)) return;
    updateState((draftState) => {
      if (draftState.viewIndex === i) return;
      if (i > turnCount(draftState)) return;
      draftState.viewIndex = i;
      draftState.ghostAction = null;
    });
  };
  const handleSeeFirstMove = () => handleViewMove(0);
  const handleSeePreviousMove = () => handleViewMove(state.viewIndex - 1);
  const handleSeeNextMove = () => handleViewMove(state.viewIndex + 1);
  const handleSeeLastMove = () => handleViewMove(turnCount(state));

  const handleIncreaseBoardSize = () => {};
  const handleDecreaseBoardSize = () => {};

  const boardHeight =
    (state.wallWidth * (dims.h - 1)) / 2 + (state.cellSize * (dims.h + 1)) / 2;

  return (
    <div>
      <Header
        gameName={state.gameId}
        showLobby
        endGame={handleEndSession}
        helpText={GameHelp()}
      />
      <StatusHeader
        lifeCycleStage={state.lifeCycleStage}
        names={state.names}
        indexToMove={indexToMove(state)}
        winner={state.winner}
        finishReason={state.finishReason}
        timeControl={state.timeControl}
        creatorStarts={state.creatorStarts}
      />
      <TimerHeader
        lifeCycleStage={state.lifeCycleStage}
        names={state.names}
        indexToMove={indexToMove(state)}
        playerColors={playerColors}
        timeLeft={state.timeLeft}
      />
      <Row className="valign-wrapper">
        <Col s={3}>
          <ControlPanel
            height={boardHeight}
            lifeCycleStage={state.lifeCycleStage}
            handleResign={handleResign}
            handleOfferDraw={handleOfferDraw}
            handleProposeTakeback={handleProposeTakeback}
            handleIncreaseOpponentTime={handleIncreaseOpponentTime}
            moveHistory={state.moveHistory}
            playerColors={playerColors}
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
          />
        </Col>
        <Col s={6}>
          <Board
            creatorToMove={creatorToMove(state)}
            playerColors={playerColors}
            grid={state.moveHistory[state.viewIndex].grid}
            playerPos={state.moveHistory[state.viewIndex].playerPos}
            goals={goals}
            ghostAction={state.ghostAction}
            handleClick={handleClick}
            cellSize={state.cellSize}
            wallWidth={state.wallWidth}
          />
        </Col>
        <Col s={3}></Col>
      </Row>
      {state.lifeCycleStage === 4 && (
        <Row className="valign-wrapper" style={{ marginTop: "1rem" }}>
          <Col s={4} />
          <Col className="center" s={4}>
            <Button
              large
              className="red"
              node="button"
              waves="light"
              onClick={handleRematch}
            >
              Rematch
            </Button>
          </Col>
          <Col s={4} />
        </Row>
      )}
      <Modal
        style={{ color: "black" }}
        actions={[
          <Button
            style={{
              backgroundColor: "#009688",
              color: "white",
              marginRight: "1rem",
            }}
            flat
            modal="close"
            node="button"
            waves="green"
            onClick={handleConfirmBackButton}
          >
            Quit game
          </Button>,
          <Button
            style={{
              backgroundColor: "#009688",
              color: "white",
            }}
            flat
            modal="close"
            node="button"
            waves="green"
            onClick={handleCancelBackButton}
          >
            Close
          </Button>,
        ]}
        bottomSheet={false}
        fixedFooter={false}
        header="Return to lobby"
        open={state.showBackButtonWarning}
        options={{
          dismissible: false,
          endingTop: "10%",
          inDuration: 250,
          opacity: 0.4,
          outDuration: 250,
          preventScrolling: true,
          startingTop: "4%",
        }}
      >
        {
          <p>
            Are you sure you want to return to the lobby? You will not be able
            to rejoin this game.
          </p>
        }
      </Modal>
    </div>
  );
};

export default GamePage;
