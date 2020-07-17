import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Row, Col } from "react-materialize";
import cloneDeep from "lodash.clonedeep";

import {
  cellTypeByPos,
  posEq,
  distance,
  canBuildWall,
} from "../gameLogic/mainLogic";
import Header from "../shared/Header";
import Board from "./Board";

const initialGameState = (gameId, duration, increment, p1Name) => {
  const randomBoolean = () => Math.random() < 0.5;

  const p1Starts = randomBoolean();
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
    //state can be grouped as follows:

    //a) state that never changes for a particular game (should it even be here?)

    //auto-generated at creation and displayed in the header; used by the joiner to join the game
    gameId: gameId,

    duration: duration, //in minutes
    increment: increment, //in seconds
    player1Starts: p1Starts, //set to a random value when game is created
    goals: [corners.br, corners.bl], //where the players have to reach to win

    //b) state that changes at life-cycle stage changes

    //life cycle of a game
    //0. created, but p2 not joined yet.
    //1. p2 joined, but no moves made yet.
    //2. joined and one player moved. Clocks still not ticking.
    //3. both players already made at least 1 move and game has not ended. Clocks are ticking.
    //4. Game ended because a winning/draw condition is reached.
    lifeCycleStage: 0,

    //auto-generated random suggestion is provided to the users, but they can overwrite it
    //player 2 gets name "______" until someone joins the game
    playerNames: [p1Name, "______"],

    winner: "", //'' for an on-going game, '1', '2', or 'draw' for a finished game
    finishReason: "", //'' for an on-going game, 'time' or 'goal' for a finished game

    //c) state that changes continuously

    remainingTime: [60 * duration, 60 * duration], //in seconds, converted to min:sec format when displayed
    p1ToMove: p1Starts,
    playerPos: [corners.tl, corners.tr],

    //indicates which walls are built, and by whom
    //for cells that correspond to walls, 0 meant not built, 1/2 means built by player1/2
    grid: grid,

    //d) local state, not shared between the client and the server

    //each "move" consists of two actions. players can see (and undo) one action applied individually
    //in their local view, but they are not sent to the server until both actions have been made
    //thus, the opponent does not see the individual actions that a player does and undos
    //this means that the two players can see slightly different boards

    //null is the player to move hasn't made any ghost action, the cell of the action otherwise
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
};

const showHelp = () => {
  console.log("todo: show game help in modal window");
};

const GamePage = (props) => {
  const gameId = useParams().gameId;
  const params = props.location.state;

  //GS is short-hand for 'gameState'. encapsulates everything about the game
  const startGS = initialGameState(
    gameId,
    params.duration,
    params.increment,
    params.playerName
  );
  const [GS, setGameState] = useState(startGS);

  //this handles the logic of storing/displaying partial moves locally,
  //and sending complete moves to the server
  const handleClick = (clickPos) => {
    const clickType = cellTypeByPos(clickPos);
    if (clickType === "Pillar") return; //we could even disable onClick for the pillars

    const ghostPos = GS.ghostAction; //partial move action
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
    if (ghostType === "None") {
      if (clickType === "Wall") {
        if (clickActCount === 1) newGS.ghostAction = clickPos;
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 1) newGS.ghostAction = clickPos;
        else if (clickActCount === 2) makeMove(newGS, [clickPos]);
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (ghostType === "Wall") {
      if (clickType === "Wall") {
        if (posEq(ghostPos, clickPos)) newGS.ghostAction = null;
        else if (clickActCount === 1) makeMove(newGS, [clickPos, ghostPos]);
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 1) makeMove(newGS, [clickPos, ghostPos]);
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else if (ghostType === "Ground") {
      if (clickType === "Wall") {
        if (clickActCount === 1) makeMove(newGS, [clickPos, ghostPos]);
        else return;
      } else if (clickType === "Ground") {
        if (clickActCount === 0) newGS.ghostAction = null;
        else if (clickActCount === 1) newGS.ghostAction = clickPos;
        else if (clickActCount === 2) makeMove(newGS, [clickPos]);
        else return;
      } else {
        console.error("unexpected action type", clickType);
      }
    } else {
      console.error("unexpected ghost type", ghostType);
    }
    setGameState((prevGS) => {
      return newGS;
    });
  };

  return (
    <div>
      <Header gameName={gameId} showLobby showHelp={showHelp} />
      <h5 style={{ marginLeft: "2rem" }}>{getStatusMessage(GS)}</h5>
      <Row className="valign-wrapper container">
        <Col className="center" s={2}>
          <h5>{GS.playerNames[0]}</h5>
        </Col>
        <Col className="center" s={2}>
          <h5>{GS.remainingTime[0]}s</h5>
        </Col>
        <Col s={4}></Col>
        <Col className="center" s={2}>
          <h5>{GS.playerNames[1]}</h5>
        </Col>
        <Col className="center" s={2}>
          <h5>{GS.remainingTime[1]}s</h5>
        </Col>
      </Row>
      <Board
        goals={GS.goals}
        playerPos={GS.playerPos}
        grid={GS.grid}
        p1ToMove={GS.p1ToMove}
        ghostAction={GS.ghostAction}
        handleClick={handleClick}
      />
    </div>
  );
};

export default GamePage;
