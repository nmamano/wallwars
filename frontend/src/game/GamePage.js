import React, { useState } from "react";
import cloneDeep from "lodash.clonedeep";

import {
  cellTypeByPos,
  posEq,
  distance,
  canBuildWall,
} from "../gameLogic/mainLogic";
import Board from "./Board";
import StatusHeader from "./StatusHeader";
import TimerHeader from "./TimerHeader";

const emptyGrid = (dims) => {
  let grid = [];
  for (let r = 0; r < dims.h; r++) {
    grid[r] = [];
    for (let c = 0; c < dims.w; c++) grid[r][c] = 0;
  }
  return grid;
};

const GamePage = ({ serverParams: params, socket }) => {
  const isPlayer1 = params.socketIds[0] === socket.id;
  const timeControl = params.timeControl;
  const p1Starts = params.p1Starts;
  const dims = { w: 23, h: 19 }; //traditional board size
  const corners = {
    tl: { r: 0, c: 0 },
    tr: { r: 0, c: dims.w - 1 },
    bl: { r: dims.h - 1, c: 0 },
    br: { r: dims.h - 1, c: dims.w - 1 },
  };
  const initialPlayerPos = [corners.tl, corners.tr];
  const goals = [corners.br, corners.bl]; //where the players have to reach to win

  const [ghostAction, setGhostAction] = useState(null);
  const [playerNames, setPlayerNames] = useState(params.playerNames);
  const [lifeCycleStage, setLifeCycleStage] = useState(isPlayer1 ? 0 : 1);
  const [playerPos, setPlayerPos] = useState(initialPlayerPos);
  const [numMoves, setNumMoves] = useState(0);
  const [grid, setGrid] = useState(emptyGrid(dims));
  //'' for an ongoing game, '1', '2', or 'draw' for a finished game
  const [winner, setWinner] = useState("");
  //'' for an on-going game, 'time' or 'goal' for a finished game
  const [finishReason, setFinishReason] = useState("");
  const [remainingTime, setRemainingTime] = useState([
    timeControl.duration * 60,
    timeControl.duration * 60,
  ]);

  const p1ToMove = () => numMoves % 2 === (p1Starts ? 0 : 1);
  const playerToMove = () => (p1ToMove() ? 1 : 2);

  //'actions' may contain a single action which is a double step,
  //or two actions which wall/wall or wall/single-step
  const makeMove = (actions) => {
    setGhostAction(null);
    let newPlayerPos = cloneDeep(playerPos);
    const newGrid = cloneDeep(grid);
    let [hasGroundAction, hasWallAction] = [false, false];

    for (let k = 0; k < actions.length; k++) {
      const aPos = actions[k];
      const aType = cellTypeByPos(aPos);
      if (aType === "Ground") {
        hasGroundAction = true;
        newPlayerPos[playerToMove() - 1] = aPos;
      } else if (aType === "Wall") {
        hasWallAction = true;
        newGrid[aPos.r][aPos.c] = playerToMove();
      } else console.error("unexpected action type", aType);
    }
    if (hasGroundAction) setPlayerPos(newPlayerPos);
    if (hasWallAction) setGrid(newGrid);
    setNumMoves(numMoves + 1);
    if (lifeCycleStage === 1) setLifeCycleStage(2);
    else if (lifeCycleStage === 2) setLifeCycleStage(3);
  };

  if (isPlayer1) {
    socket.once("p2Joined", (serverParams) => {
      console.log("player 2 joined");
      setPlayerNames(serverParams.playerNames);
      setLifeCycleStage(1);
    });
  }

  //one of 'None', 'Ground', 'Wall'
  const ghostType = () =>
    ghostAction === null ? "None" : cellTypeByPos(ghostAction);

  //when player selects / clicks a cell, it can trigger a different number of actions
  //1 action: build 1 wall or 1 step
  const clickActionCount = (clickPos) => {
    let [pos1, pos2] = cloneDeep(playerPos);
    const clickType = cellTypeByPos(clickPos);
    if (clickType === "Ground") {
      const actorPos = playerToMove() === 1 ? pos1 : pos2;
      return distance(grid, actorPos, clickPos);
    } else if (clickType === "Wall") {
      const gridCopy = cloneDeep(grid); //copy to preserve immutability of state
      if (ghostType() === "Wall") {
        //block ghost wall for the check
        gridCopy[ghostAction.r][ghostAction.c] = 1;
      } else if (ghostType() === "Ground") {
        //use ghost position for the check
        [pos1, pos2] =
          playerToMove() === 1 ? [ghostAction, pos2] : [pos1, ghostAction];
      }
      return canBuildWall(gridCopy, [pos1, pos2], goals, clickPos) ? 1 : 0;
    } else {
      console.error("unexpected action type", clickType);
    }
  };

  //handles the logic of ghost moves and sending complete moves to the server
  const handleClick = (clickPos) => {
    if (isPlayer1 !== p1ToMove()) return; //can only move if it's your turn
    if (lifeCycleStage === 0) return; //cannot move til player 2 joins
    const clickType = cellTypeByPos(clickPos);
    if (lifeCycleStage < 3 && clickType === "Wall") return; //first move cannot be wall
    const clickActCount = clickActionCount(clickPos);
    let moveActions = null;
    if (ghostType() === "None") {
      if (clickType === "Wall") {
        if (clickActCount === 1) setGhostAction(clickPos);
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 1) setGhostAction(clickPos);
        else if (clickActCount === 2) moveActions = [clickPos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (ghostType() === "Wall") {
      if (clickType === "Wall") {
        if (posEq(ghostAction, clickPos)) setGhostAction(null);
        else if (clickActCount === 1) moveActions = [clickPos, ghostAction];
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 1) moveActions = [clickPos, ghostAction];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (ghostType() === "Ground") {
      if (clickType === "Wall") {
        if (clickActCount === 1) moveActions = [clickPos, ghostAction];
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 0) setGhostAction(null);
        else if (clickActCount === 1) setGhostAction(clickPos);
        else if (clickActCount === 2) moveActions = [clickPos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else {
      console.error("unexpected ghost type", ghostType());
    }

    if (moveActions) {
      makeMove(moveActions);
      socket.emit("move", moveActions);
    }
  };

  socket.once("move", (actions) => {
    console.log("received move ", actions);
    makeMove(actions);
  });

  const playerColors = ["red", "indigo"];
  return (
    <div>
      <StatusHeader
        playerNames={playerNames}
        lifeCycleStage={lifeCycleStage}
        winner={winner}
        finishReason={finishReason}
        numMoves={numMoves}
        p1ToMove={p1ToMove()}
      />
      <TimerHeader
        playerNames={playerNames}
        playerColors={playerColors}
        remainingTime={remainingTime}
        p1ToMove={p1ToMove()}
      />
      <Board
        goals={goals}
        playerPos={playerPos}
        grid={grid}
        ghostAction={ghostAction}
        playerColors={playerColors}
        handleClick={handleClick}
        p1ToMove={p1ToMove()}
      />
    </div>
  );
};

export default GamePage;
