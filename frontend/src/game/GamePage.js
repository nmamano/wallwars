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

const initialGameState = (params, lifeCycleStage) => {
  const dims = { w: 23, h: 19 }; //traditional board size
  const corners = {
    tl: { r: 0, c: 0 },
    tr: { r: 0, c: dims.w - 1 },
    bl: { r: dims.h - 1, c: 0 },
    br: { r: dims.h - 1, c: dims.w - 1 },
  };
  let grid = [];
  for (let r = 0; r < dims.h; r++) {
    grid[r] = [];
    for (let c = 0; c < dims.w; c++) grid[r][c] = 0;
  }
  return {
    //a) state that never changes for a particular game (probably needs to be refactored out of here)
    gameId: params.gameId,
    timeControl: params.timeControl,
    p1Starts: params.p1Starts, //set to a random value when game is created
    goals: [corners.br, corners.bl], //where the players have to reach to win

    //b) state that changes at life-cycle stage changes
    lifeCycleStage: lifeCycleStage,
    playerNames: params.playerNames,
    winner: "", //'' for an on-going game, '1', '2', or 'draw' for a finished game
    finishReason: "", //'' for an on-going game, 'time' or 'goal' for a finished game

    //c) state that changes continuously
    remainingTime: [
      params.timeControl.duration * 60,
      params.timeControl.duration * 60,
    ], //in seconds, converted to min:sec format when displayed
    p1ToMove: params.p1Starts,
    playerPos: [corners.tl, corners.tr],
    grid: grid,

    //d) local state, not shared between the client and the server
    ghostAction: null,
  };
};

//each stage in the life cycle of the game gets a status message
const getStatusMessage = (GS) => {
  const p1ToMove = GS.p1ToMove;
  const [p1Name, p2Name] = GS.playerNames;
  switch (GS.lifeCycleStage) {
    case 0:
      return "Waiting for player 2 to join";
    case 1:
      return `${p1ToMove ? p1Name : p2Name} starts`;
    case 2:
    case 3:
      return `${p1ToMove ? p1Name : p2Name} to move`;
    case 4:
      const w = GS.winner;
      if (w === "draw") return "The game ended in draw";
      return `${w === "1" ? p1Name : p2Name} won on ${
        GS.finishReason === "time" ? "on time" : "by reaching the goal"
      }`;
    default:
      console.error("stage should be in range 0..4");
  }
};

//'actions' may contain a single action which is a double step,
//or two actions which wall/wall or wall/single-step
const makeMove = (GS, actions) => {
  const actor = GS.p1ToMove ? 1 : 2;
  for (let k = 0; k < actions.length; k++) {
    const aPos = actions[k];
    const actionType = cellTypeByPos(aPos);
    if (actionType === "Ground") {
      GS.playerPos[actor - 1] = aPos;
    } else if (actionType === "Wall") {
      GS.grid[aPos.r][aPos.c] = actor;
    } else {
      console.error("unexpected action type", actionType);
    }
  }
  GS.ghostAction = null;
  GS.p1ToMove = !GS.p1ToMove;
  if (GS.lifeCycleStage === 1) GS.lifeCycleStage = 2;
  if (GS.lifeCycleStage === 2) GS.lifeCycleStage = 3;
};

const GamePage = ({ serverParams: params, socket }) => {
  const isCreator = params.socketIds[0] === socket.id;

  const [GS, setGameState] = useState(
    initialGameState(params, isCreator ? 0 : 1)
  );

  if (isCreator) {
    socket.once("p2Joined", (serverParams) => {
      console.log("player 2 joined");
      setGameState(initialGameState(serverParams, 1));
    });
  }

  socket.once("move", (actions) => {
    console.log("received move ", actions);
    const newGS = cloneDeep(GS);
    makeMove(newGS, actions);
    setGameState(newGS);
  });

  //this handles the logic of storing/displaying partial moves locally,
  //and sending complete moves to the server
  const handleClick = (clickPos) => {
    if (isCreator !== GS.p1ToMove) return; //can only move if it's your turn

    const clickType = cellTypeByPos(clickPos);
    if (clickType === "Pillar") return; //would be cleaner to disable onClick for the pillars

    const ghostPos = GS.ghostAction;
    const ghostType = ghostPos === null ? "None" : cellTypeByPos(ghostPos); //one of 'None', 'Ground', 'Wall'
    const actor = GS.p1ToMove ? 1 : 2;

    const newGS = cloneDeep(GS);

    //when player selects / clicks a cell, it can trigger a different number of actions
    //1 action: build 1 wall or 1 step
    let clickActCount; //number of actions for the clicked cell
    if (clickType === "Ground") {
      clickActCount = distance(GS.grid, GS.playerPos[actor - 1], clickPos);
    } else if (clickType === "Wall") {
      //make temporarily changes for block check
      if (ghostType === "Wall") newGS.grid[ghostPos.r][ghostPos.c] = 1;
      if (ghostType === "Ground") {
        var actualPos = cloneDeep(newGS.playerPos[actor - 1]);
        newGS.playerPos[actor - 1] = cloneDeep(ghostPos);
      }

      if (canBuildWall(newGS.grid, newGS.playerPos, newGS.goals, clickPos))
        clickActCount = 1;
      else clickActCount = 0;

      //undo temporary changes
      if (ghostType === "Wall") newGS.grid[ghostPos.r][ghostPos.c] = 0;
      if (ghostType === "Ground") newGS.playerPos[actor - 1] = actualPos;
    } else {
      clickActCount = 0; //clicked on pillar
    }

    //how the state should change depends on the pre-existing partial-move state
    //and the newly clicked pos/action
    let moveActions = null;
    if (ghostType === "None") {
      if (clickType === "Wall") {
        if (clickActCount === 1) newGS.ghostAction = clickPos;
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 1) newGS.ghostAction = clickPos;
        else if (clickActCount === 2) moveActions = [clickPos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (ghostType === "Wall") {
      if (clickType === "Wall") {
        if (posEq(ghostPos, clickPos)) newGS.ghostAction = null;
        else if (clickActCount === 1) moveActions = [clickPos, ghostPos];
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 1) moveActions = [clickPos, ghostPos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (ghostType === "Ground") {
      if (clickType === "Wall") {
        if (clickActCount === 1) moveActions = [clickPos, ghostPos];
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 0) newGS.ghostAction = null;
        else if (clickActCount === 1) newGS.ghostAction = clickPos;
        else if (clickActCount === 2) moveActions = [clickPos];
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else {
      console.error("unexpected ghost type", ghostType);
    }

    if (moveActions) {
      makeMove(newGS, moveActions);
      setGameState(newGS);
      socket.emit("move", moveActions);
    } else {
      setGameState(newGS); //ghost moves
    }
  };

  const actor = GS.p1ToMove ? 1 : 2;
  const name1 = GS.playerNames[0];
  const name2 = GS.playerNames[1] === null ? "......" : GS.playerNames[1];
  const playerColors = ["red", "indigo"];
  const [color1, color2] = playerColors;
  const turnHighlight = "lighten-1 z-depth-2";
  const lowTimeColor = "orange lighten-2 z-depth-3";
  const lowTime = 15;
  const [time1, time2] = GS.remainingTime;
  return (
    <div>
      <h5 style={{ marginLeft: "2rem" }}>{getStatusMessage(GS)}</h5>
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
        goals={GS.goals}
        playerPos={GS.playerPos}
        grid={GS.grid}
        p1ToMove={GS.p1ToMove}
        ghostAction={GS.ghostAction}
        playerColors={playerColors}
        handleClick={handleClick}
      />
    </div>
  );
};

export default GamePage;
