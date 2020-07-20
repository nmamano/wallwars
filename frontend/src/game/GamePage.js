import React, { useState } from "react";
import { Row, Col } from "react-materialize";
import cloneDeep from "lodash.clonedeep";

import {
  cellTypeByPos,
  posEq,
  distance,
  canBuildWall,
} from "../gameLogic/mainLogic";
import Board from "./Board";

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

  //each stage in the life cycle of the game gets a status message
  const getStatusMessage = () => {
    const [name1, name2] = playerNames;
    switch (lifeCycleStage) {
      case 0:
        return "Waiting for player 2 to join";
      case 1:
        return `${p1ToMove() ? name1 : name2} starts`;
      case 2:
      case 3:
        return `${p1ToMove() ? name1 : name2} to move`;
      case 4:
        const w = winner;
        if (w === "draw") return "The game ended in draw";
        return `${w === "1" ? name1 : name2} won on ${
          finishReason === "time" ? "on time" : "by reaching the goal"
        }`;
      default:
        console.error("stage should be in range 0..4");
    }
  };

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
    const clickType = cellTypeByPos(clickPos);
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

  const actor = p1ToMove() ? 1 : 2;
  const name1 = playerNames[0];
  const name2 = playerNames[1] === null ? "......" : playerNames[1];
  const playerColors = ["red", "indigo"];
  const [color1, color2] = playerColors;
  const turnHighlight = "lighten-1 z-depth-2";
  const lowTimeColor = "orange lighten-2 z-depth-3";
  const lowTime = 15;
  const [time1, time2] = remainingTime;
  return (
    <div>
      <h5 style={{ marginLeft: "2rem" }}>{getStatusMessage()}</h5>
      <Row className="valign-wrapper container">
        <Col
          className={
            "center" + (actor === 1 ? ` ${color1} ${turnHighlight}` : "")
          }
          s={2}
        >
          <h5>{name1}</h5>
        </Col>
        <Col
          className={
            "center" +
            (actor === 1 && time1 < lowTime ? ` ${lowTimeColor}` : "")
          }
          s={2}
          style={{ margin: "0rem 1rem" }}
        >
          <h5>{time1}s</h5>
        </Col>
        <Col s={4}></Col>
        <Col
          className={
            "center" +
            (actor === 2 && time2 < lowTime ? ` ${lowTimeColor}` : "")
          }
          s={2}
          style={{ margin: "0rem 1rem" }}
        >
          <h5>{time2}s</h5>
        </Col>
        <Col
          className={
            "center" + (actor === 2 ? ` ${color2} ${turnHighlight}` : "")
          }
          s={2}
        >
          <h5>{name2}</h5>
        </Col>
      </Row>
      <Board
        goals={goals}
        playerPos={playerPos}
        grid={grid}
        p1ToMove={p1ToMove()}
        ghostAction={ghostAction}
        playerColors={playerColors}
        handleClick={handleClick}
      />
    </div>
  );
};

export default GamePage;
