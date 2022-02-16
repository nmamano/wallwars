import cloneDeep from "lodash.clonedeep";

import {
  cellTypeByPos,
  posEq,
  emptyGrid,
  distance,
  isDistanceAtMost,
  canBuildWall,
  emptyBoardDistances,
  cellEnum,
} from "../shared/gameLogicUtils";
import { defaultBoardSettings } from "../shared/globalSettings";
import {
  parsePuzzleMoveList,
  puzzleBoardSettingsToInternalBoardSettings,
} from "./puzzleLogic";

/* this file contains functions that modify a copy of the state of GamePage
the state itself is immutable, as per the react philosophy, but we can
make changes to a copy of it (called 'draftState' below)
the 'Immer' state manager takes care of updating the actual state */

export const roleEnum = {
  creator: "creator",
  joiner: "joiner",
  spectator: "spectator",
  returner: "returner",
  offline: "offline",
  computer: "computer",
  puzzle: "puzzle",
};

//pure utility functions
export const turnCount = (state) => state.moveHistory.length - 1;

export const creatorToMove = (state) =>
  turnCount(state) % 2 === (state.creatorStarts ? 0 : 1);

export const creatorToMoveAtIndex = (state) =>
  state.viewIndex % 2 === (state.creatorStarts ? 0 : 1);

export const indexToMove = (state) => (creatorToMove(state) ? 0 : 1);

//one of 'None', 'Ground', 'Wall'
export const ghostType = (pos) => (pos === null ? "None" : cellTypeByPos(pos));

export const isOpponentPresent = (state) => {
  return state.arePlayersPresent[state.clientRole === roleEnum.creator ? 1 : 0];
};

//the previous position of the player, if they moved in the last turn
//(based on the current move index, not the last move played)
export const getTracePos = (state) => {
  if (state.viewIndex === 0) return null;
  const playerIndex = creatorToMoveAtIndex(state) ? 1 : 0;
  const curPos = state.moveHistory[state.viewIndex].playerPos[playerIndex];
  let prevPos;
  if (state.viewIndex <= 2) {
    prevPos = state.boardSettings.startPos[playerIndex];
  } else {
    prevPos = state.moveHistory[state.viewIndex - 2].playerPos[playerIndex];
  }
  return posEq(prevPos, curPos) ? null : prevPos;
};

//when the player selects a cell, it can trigger a different
//number of actions (1 action: build 1 wall or move 1 step)
//this function counts the number of actions for a selected position
const countActions = (
  grid,
  selectedPos,
  posActor,
  posOther,
  goalActor,
  goalOther,
  extraWalls
) => {
  const gridCopy = cloneDeep(grid);
  for (let k = 0; k < extraWalls.length; k++) {
    const W = extraWalls[k];
    gridCopy[W[0]][W[1]] = 1;
  }
  if (cellTypeByPos(selectedPos) === cellEnum.ground) {
    return distance(gridCopy, posActor, selectedPos);
  }
  return canBuildWall(
    gridCopy,
    [posActor, posOther],
    [goalActor, goalOther],
    selectedPos
  )
    ? 1
    : 0;
};

//analogous to the constructor for a class
export const createInitialState = (cookies) => {
  const draftState = {
    //===================================================
    //state about the session (sequence of games played by rematching)
    //===================================================
    //game code used by the joiner to join the game
    joinCode: null,
    //json object with duration in minutes and increment in seconds
    timeControl: null,
    names: [null, null],
    //the icon used for the player. The default icon is special in that it is
    //different for the creator and joiner
    tokens: ["default", "default"],

    //how many games each player has won in this session
    matchScore: [0, 0],

    //players can return to a game even if they close the browser
    //(as long as they use the same elo id)
    //but if they create/join another game, this counts as abandonment
    //and they cannot join anymore
    opponentAbandoned: false,

    //indicates if the players have the game page open
    //the game goes on even if both leave, but actions that require both
    //players to agree are disabled if one of the players is not present
    //eg., agreeing to a draw, starting a rematch, or doing a takeback
    arePlayersPresent: [false, false],

    //===================================================
    //shared state of the current game
    //===================================================
    creatorStarts: null, //who starts is decided by the server
    winner: "", //'' if game is ongoing, else 'creator', 'joiner', or 'draw'
    //'' if game is ongoing, 'goal' or agreement' if drawn,
    //'time', 'goal', 'resign', or 'abandon' if someone won
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
        grid: emptyGrid(defaultBoardSettings.dims),
        playerPos: defaultBoardSettings.startPos,
        timeLeft: [null, null],
        distances: emptyBoardDistances(defaultBoardSettings),
        wallCounts: [0, 0],
      },
    ],

    ratings: [0, 0],

    //===================================================
    //state unique to this client
    //===================================================
    clientRole: null, //creator, joiner, or spectator
    moveToSend: null, //moves to be sent to the other client are stored here temporarily

    //the ghost action is a single action done and shown only to this client
    //when it is this client's turn to move. it can be combined with another
    //action to make a full move, or undone in order to choose a different action
    ghostAction: null,

    //premove actions are one or two actions done by this client when it is not
    //this client's turn to move. once the opponent moves, the game behaves as if
    //the client inputted the premove actions during their turn
    premoveActions: [],

    isVolumeOn: false,
    shouldPlaySound: false, //actions that trigger a sound set this to true

    isKeyPressed: false,
    //index of the move that the client is looking at, which may not be the last one
    viewIndex: 0,
    zoomLevel: 5, //number from 0 to 10

    //the client pings the server periodically to make sure the server is alive
    //'waitingForPing' is increased every 'pingInterval' seconds.
    //It is reset to 0 at every server message. A ping message is sent if waitingForPing
    //reaches 2 (meaning, it has gone at least 'pingInterval' seconds without hearing
    //from server). A warning is displayed to the user if it reaches 3 saying the server
    //is probably unreachable.
    waitingForPing: 0,

    //various dialogs where the player needs to make a decision
    showDrawDialog: false,
    showTakebackDialog: false,
    showRematchDialog: false,

    boardSettings: defaultBoardSettings, //by default, startPos and goalPos are at the corners
  };
  applyCookieSettings(draftState, cookies);
  return draftState;
};

const applyCookieSettings = (draftState, cookies) => {
  if (!cookies) return;
  if (cookies.isVolumeOn && cookies.isVolumeOn === "true")
    draftState.isVolumeOn = true;
  if (cookies.zoomLevel) {
    const zoomVal = parseInt(cookies.zoomLevel);
    if (zoomVal >= 0 && zoomVal <= 10) draftState.zoomLevel = zoomVal;
  }
};

export const applyAddCreator = (
  draftState,
  timeControl,
  boardSettings,
  name,
  token
) => {
  draftState.clientRole = roleEnum.creator;
  draftState.lifeCycleStage = -1;
  draftState.timeControl = timeControl;
  draftState.boardSettings = boardSettings;
  draftState.names[0] = name;
  draftState.tokens[0] = token;
  const totalTimeInSeconds = timeControl.duration * 60;
  draftState.moveHistory[0].timeLeft = [totalTimeInSeconds, totalTimeInSeconds];
  draftState.moveHistory[0].grid = emptyGrid(boardSettings.dims);
  draftState.moveHistory[0].playerPos = boardSettings.startPos;
  draftState.moveHistory[0].distances = emptyBoardDistances(boardSettings);
};

export const applyAddJoiner = (draftState, joinCode, name, token) => {
  draftState.clientRole = roleEnum.joiner;
  draftState.lifeCycleStage = -1;
  draftState.joinCode = joinCode;
  draftState.names[1] = name;
  draftState.tokens[1] = token;
};

//data sent by the server to the creator
export const applyCreatedOnServer = (
  draftState,
  joinCode,
  creatorStarts,
  rating
) => {
  //if life cycle stage is already 0, it means we already processed the response
  if (draftState.lifeCycleStage === 0) return;
  draftState.joinCode = joinCode;
  draftState.creatorStarts = creatorStarts;
  draftState.lifeCycleStage = 0;
  draftState.ratings[0] = rating;
};

//data sent by the server to the joiner
export const applyJoinedOnServer = (
  draftState,
  creatorName,
  creatorToken,
  timeControl,
  boardSettings,
  creatorStarts,
  creatorPresent,
  creatorRating,
  joinerRating
) => {
  //if life cycle stage is already 1, it means we already joined
  if (draftState.lifeCycleStage === 1) return;
  draftState.creatorStarts = creatorStarts;
  draftState.names[0] = creatorName;
  draftState.tokens[0] = creatorToken;
  draftState.timeControl = timeControl;
  draftState.boardSettings = boardSettings;
  draftState.arePlayersPresent[0] = creatorPresent;
  const startSeconds = timeControl.duration * 60;
  draftState.moveHistory[0].timeLeft = [startSeconds, startSeconds];
  draftState.moveHistory[0].grid = emptyGrid(boardSettings.dims);
  draftState.moveHistory[0].playerPos = boardSettings.startPos;
  draftState.moveHistory[0].distances = emptyBoardDistances(boardSettings);
  draftState.lifeCycleStage = 1;
  draftState.ratings = [creatorRating, joinerRating];
};

export const applyJoinerJoined = (
  draftState,
  joinerName,
  joinerToken,
  joinerRating
) => {
  //if life cycle stage is already 1, it means the joiner already joined
  if (draftState.lifeCycleStage === 1) return;
  draftState.names[1] = joinerName;
  draftState.tokens[1] = joinerToken;
  draftState.lifeCycleStage = 1;
  draftState.ratings[1] = joinerRating;
};

export const applyCreatedLocally = (
  draftState,
  timeControl,
  boardSettings,
  name,
  token
) => {
  applyAddCreator(draftState, timeControl, boardSettings, name + "1", token);
  applyCreatedOnServer(draftState, "local", Math.random() < 0.5, 0);
  applyJoinerJoined(draftState, name + "2", "cloud_off", 0);
};

export const applyCreatedVsComputer = (
  draftState,
  boardSettings,
  name,
  token
) => {
  const timeControl = {
    duration: 60,
    increment: 0,
  };
  applyAddCreator(draftState, timeControl, boardSettings, name, token);
  applyCreatedOnServer(draftState, "AI", Math.random() < 0.5, 0);
  applyJoinerJoined(draftState, "AI", "memory", 0);
};

export const applyCreatedPuzzle = (draftState, name, token, puzzle) => {
  const timeControl = {
    duration: 60,
    increment: 0,
  };
  applyAddCreator(
    draftState,
    timeControl,
    puzzleBoardSettingsToInternalBoardSettings(puzzle.boardSettings),
    puzzle.playAsCreator ? name : puzzle.author,
    puzzle.playAsCreator ? token : "extension"
  );
  applyCreatedOnServer(draftState, "Puzzle", puzzle.creatorStarts, 0);
  applyJoinerJoined(
    draftState,
    !puzzle.playAsCreator ? name : puzzle.author,
    !puzzle.playAsCreator ? token : "extension",
    0
  );
  const moves = parsePuzzleMoveList(puzzle.moves);
  // Play setup moves:
  for (let i = 0; i < puzzle.startIndex; i++) {
    applyMove(draftState, moves[i][0], 60 * 60, i + 1);
  }
};

export const applyPuzzleMove = (draftState, puzzle) => {
  const tc = turnCount(draftState);
  const actions = parsePuzzleMoveList(puzzle.moves)[tc][0];
  applyMove(draftState, actions, 60 * 60, tc + 1);
};

export const applyReturnToGame = (
  draftState,
  serverGame,
  isCreator,
  timeLeft
) => {
  //if game is already initialized, don't return to game again
  if (draftState.timeControl) return;
  const clientRole = isCreator ? roleEnum.creator : roleEnum.joiner;
  if (clientRole === roleEnum.creator) {
    applyAddCreator(
      draftState,
      serverGame.timeControl,
      serverGame.boardSettings,
      serverGame.playerNames[0],
      serverGame.playerTokens[0]
    );
    applyCreatedOnServer(
      draftState,
      serverGame.joinCode,
      serverGame.creatorStarts,
      serverGame.ratings[0]
    );
    applyJoinerJoined(
      draftState,
      serverGame.playerNames[1],
      serverGame.playerTokens[1],
      serverGame.ratings[1]
    );
  } else {
    applyAddJoiner(
      draftState,
      serverGame.joinCode,
      serverGame.playerNames[1],
      serverGame.playerTokens[1]
    );
    applyJoinedOnServer(
      draftState,
      serverGame.playerNames[0],
      serverGame.playerTokens[0],
      serverGame.timeControl,
      serverGame.boardSettings,
      serverGame.creatorStarts,
      true,
      serverGame.ratings[0],
      serverGame.ratings[1]
    );
  }
  draftState.arePlayersPresent = serverGame.arePlayersPresent;
  for (let k = 0; k < serverGame.moveHistory.length; k++) {
    const actions = serverGame.moveHistory[k].actions;
    const tLeft = serverGame.moveHistory[k].remainingTime;
    applyMove(draftState, actions, tLeft, k + 1);
  }
  draftState.matchScore = serverGame.matchScore;
  draftState.winner = serverGame.winner;
  draftState.finishReason = serverGame.finishReason;
  const tc = turnCount(draftState);
  draftState.moveHistory[tc].timeLeft = timeLeft;
  if (serverGame.winner !== "") {
    draftState.lifeCycleStage = 4;
  } else {
    if (timeLeft[0] === 0) applyWonOnTime(draftState, 1);
    else if (timeLeft[1] === 0) applyWonOnTime(draftState, 0);
  }
};

export const applyReceivedGame = (draftState, serverGame) => {
  applyAddCreator(
    draftState,
    serverGame.timeControl,
    serverGame.boardSettings,
    serverGame.playerNames[0],
    serverGame.playerTokens[0]
  );
  applyCreatedOnServer(
    draftState,
    serverGame.joinCode,
    serverGame.creatorStarts,
    serverGame.ratings[0]
  );
  applyJoinerJoined(
    draftState,
    serverGame.playerNames[1],
    serverGame.playerTokens[1],
    serverGame.ratings[1]
  );
  for (let k = 0; k < serverGame.moveHistory.length; k++) {
    const actions = serverGame.moveHistory[k].actions;
    const tLeft = serverGame.moveHistory[k].remainingTime;
    applyMove(draftState, actions, tLeft, k + 1);
  }
  draftState.clientRole = roleEnum.spectator;
  draftState.matchScore = serverGame.matchScore;
  draftState.winner = serverGame.winner;
  draftState.finishReason = serverGame.finishReason;
  draftState.lifeCycleStage = 4;
};

//applies the move number 'moveIndex', consisting of the action(s) in 'actions',
//'timeLeftAfterMove' is the time left by the player who made the move
export const applyMove = (
  draftState,
  actions,
  timeLeftAfterMove,
  moveIndex
) => {
  //only in life cycle stages 1,2,3 players can make move
  if (draftState.lifeCycleStage < 1 || draftState.lifeCycleStage > 3) return;
  //make the move only if it is the next one (safety measure against desync issues)
  const tc = turnCount(draftState);
  if (tc !== moveIndex - 1) return;

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
    if (aType === cellEnum.ground) {
      newPlayerPos[idxToMove] = aPos;
      if (posEq(aPos, draftState.boardSettings.goalPos[idxToMove])) {
        const pToMoveStarted = tc % 2 === 0;
        const otherIsWithinOneMove = isDistanceAtMost(
          newGrid,
          newPlayerPos[otherIdx],
          draftState.boardSettings.goalPos[otherIdx],
          2
        );
        if (pToMoveStarted && otherIsWithinOneMove) {
          draftState.winner = "draw";
          draftState.matchScore[0] += 0.5;
          draftState.matchScore[1] += 0.5;
        } else {
          draftState.winner =
            idxToMove === 0 ? roleEnum.creator : roleEnum.joiner;
          draftState.matchScore[idxToMove]++;
        }
        draftState.finishReason = "goal";
        draftState.lifeCycleStage = 4;
      }
    } else if (aType === cellEnum.wall) {
      newGrid[aPos[0]][aPos[1]] = idxToMove + 1;
      wallCounts[idxToMove]++;
    } else console.error("unexpected action type", aType);
  }
  draftState.moveHistory.push({
    index: tc + 1,
    actions: actions,
    grid: newGrid,
    playerPos: newPlayerPos,
    timeLeft: newTimeLeft,
    distances: [
      distance(newGrid, newPlayerPos[0], draftState.boardSettings.goalPos[0]),
      distance(newGrid, newPlayerPos[1], draftState.boardSettings.goalPos[1]),
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

  //apply premoves, if any
  if (draftState.premoveActions.length > 0) {
    const acts = draftState.premoveActions;
    draftState.premoveActions = [];
    for (let k = 0; k < acts.length; k++)
      applySelectedCell(draftState, acts[k], true);
  }
};

//manage the state change on click or keyboard press. this may
//change the ghost action (which is only shown to this client), or
//make a full move, in which case it is also sent to the other client
export const applySelectedCell = (draftState, pos, clientToMove) => {
  if (!clientToMove) {
    applySelectedCellPremove(draftState, pos);
    return;
  }
  if (draftState.lifeCycleStage < 1) return; //cannot move til player 2 joins
  if (draftState.lifeCycleStage > 3) return; //cannot move if game finished
  //can only move if looking at current position
  if (draftState.viewIndex !== turnCount(draftState)) return;
  //out of bounds position, can happen when using the keyboard keys
  const dims = draftState.boardSettings.dims;
  if (pos[0] < 0 || pos[0] >= dims[0] || pos[1] < 0 || pos[1] >= dims[1])
    return;

  const selectedType = cellTypeByPos(pos);
  const idx = indexToMove(draftState);
  const otherIdx = idx === 0 ? 1 : 0;
  const gType = ghostType(draftState.ghostAction);
  const extraWalls = gType === cellEnum.wall ? [draftState.ghostAction] : [];
  const tc = turnCount(draftState);
  let curPos = draftState.moveHistory[tc].playerPos[idx];
  if (selectedType === cellEnum.wall && gType === cellEnum.ground)
    curPos = draftState.ghostAction;
  const actCount = countActions(
    draftState.moveHistory[tc].grid,
    pos,
    curPos,
    draftState.moveHistory[tc].playerPos[otherIdx],
    draftState.boardSettings.goalPos[idx],
    draftState.boardSettings.goalPos[otherIdx],
    extraWalls
  );
  if (actCount > 2) return; //clicked a ground cell at distance >2

  //variables to store the outcome of the click, if any.
  //in the case analysis below, if we detect that the click does
  //not trigger any change, we simply return
  //see docs/moveLogic.md for the description of the case analysis
  let [fullMoveActions, newGhostAction] = [null, null];
  if (gType === "None") {
    if (selectedType === cellEnum.wall) {
      if (actCount === 1) newGhostAction = pos;
      else return;
    } else if (selectedType === cellEnum.ground) {
      if (actCount === 1) newGhostAction = pos;
      else if (actCount === 2) fullMoveActions = [pos];
      else return;
    }
  } else if (gType === cellEnum.wall) {
    if (selectedType === cellEnum.wall) {
      if (posEq(draftState.ghostAction, pos)) newGhostAction = null;
      else if (actCount === 1) fullMoveActions = [pos, draftState.ghostAction];
      else return;
    } else if (selectedType === cellEnum.ground) {
      if (actCount === 0) newGhostAction = null;
      else if (actCount === 1) fullMoveActions = [pos, draftState.ghostAction];
      else return;
    }
  } else if (gType === cellEnum.ground) {
    if (selectedType === cellEnum.wall) {
      if (actCount === 1) fullMoveActions = [pos, draftState.ghostAction];
      else return;
    } else if (selectedType === cellEnum.ground) {
      if (actCount === 0) newGhostAction = null;
      else if (actCount === 1) {
        if (posEq(pos, draftState.ghostAction)) newGhostAction = null;
        else newGhostAction = pos;
      } else if (actCount === 2) fullMoveActions = [pos];
      else return;
    }
  } else {
    console.error("unexpected ghost type", gType);
  }

  if (fullMoveActions) {
    const idx = indexToMove(draftState);
    const tc = turnCount(draftState);
    let tLeft = draftState.moveHistory[tc].timeLeft[idx];
    //we don't add the increment until the clocks start running (stage 3)
    if (draftState.lifeCycleStage === 3)
      tLeft += draftState.timeControl.increment;
    draftState.shouldPlaySound = true;
    applyMove(draftState, fullMoveActions, tLeft, turnCount(draftState) + 1);
    draftState.moveToSend = {
      actions: fullMoveActions,
      remainingTime: tLeft,
      distances:
        draftState.moveHistory[draftState.moveHistory.length - 1].distances,
    };
  } else {
    draftState.ghostAction = newGhostAction;
  }
};

//manage the state change on click or keyboard press.
//dual function of applySelectedCell for when it's not your turn
const applySelectedCellPremove = (draftState, pos) => {
  if (draftState.lifeCycleStage > 3) return; //cannot premove if game finished
  //can only premove if looking at current position
  if (draftState.viewIndex !== turnCount(draftState)) return;
  //out of bounds position, can happen when using the keyboard keys

  const dims = draftState.boardSettings.dims;
  if (pos[0] < 0 || pos[0] >= dims[0] || pos[1] < 0 || pos[1] >= dims[1])
    return;

  const selectedType = cellTypeByPos(pos);
  const idx = indexToMove(draftState) === 0 ? 1 : 0;
  const otherIdx = idx === 0 ? 1 : 0;
  const tc = turnCount(draftState);
  const premoveWalls = [];
  let premoveGround = null;
  for (let k = 0; k < draftState.premoveActions.length; k++) {
    const act = draftState.premoveActions[k];
    if (cellTypeByPos(act) === cellEnum.wall) premoveWalls.push(act);
    else premoveGround = act;
  }
  let curPos = draftState.moveHistory[tc].playerPos[idx];
  if (selectedType === cellEnum.wall && premoveGround) curPos = premoveGround;
  const actCount = countActions(
    draftState.moveHistory[tc].grid,
    pos,
    curPos,
    draftState.moveHistory[tc].playerPos[otherIdx],
    draftState.boardSettings.goalPos[idx],
    draftState.boardSettings.goalPos[otherIdx],
    premoveWalls
  );
  let premoveGroundDist = null;
  if (premoveGround)
    premoveGroundDist = countActions(
      draftState.moveHistory[tc].grid,
      premoveGround,
      draftState.moveHistory[tc].playerPos[idx],
      draftState.moveHistory[tc].playerPos[otherIdx],
      draftState.boardSettings.goalPos[idx],
      draftState.boardSettings.goalPos[otherIdx],
      premoveWalls
    );

  if (actCount > 2) return;

  //see docs/moveLogic.md for the description of the case analysis below
  const premoveEnum = {
    empty: "empty",
    wall: "wall",
    wallWall: "wallWall",
    groundWall: "groundWall",
    groundDist1: "groundDist1",
    groundDist2: "groundDist2",
  };
  let premoveState;
  if (draftState.premoveActions.length === 0) premoveState = premoveEnum.empty;
  else if (!premoveGround && premoveWalls.length === 1)
    premoveState = premoveEnum.wall;
  else if (!premoveGround && premoveWalls.length === 2)
    premoveState = premoveEnum.wallWall;
  else if (premoveGround && premoveWalls.length === 1)
    premoveState = premoveEnum.groundWall;
  else if (premoveGround && premoveGroundDist === 1)
    premoveState = premoveEnum.groundDist1;
  else if (premoveGround && premoveGroundDist === 2)
    premoveState = premoveEnum.groundDist2;
  else {
    console.error(
      "Unknown premove state",
      premoveGround,
      premoveWalls,
      actCount,
      premoveGroundDist
    );
    return;
  }

  let newPremoveActions = [];
  if (posEq(pos, curPos)) {
    if (draftState.premoveActions.length === 0) return;
    else {
      //selecting the current position undoes any premoves
      draftState.premoveActions = [];
      return;
    }
  }

  let [W, W2] = [null, null];
  if (premoveWalls.length === 1) [W, W2] = [premoveWalls[0], null];
  else if (premoveWalls.length === 2)
    [W, W2] = [premoveWalls[0], premoveWalls[1]];
  if (premoveState === premoveEnum.empty) {
    if (selectedType === cellEnum.wall) {
      if (actCount === 1) newPremoveActions = [pos];
      else return;
    } else if (selectedType === cellEnum.ground) {
      if (actCount === 1 || actCount === 2) newPremoveActions = [pos];
      else console.error("unreachable case");
    }
  } else if (premoveState === premoveEnum.wall) {
    if (selectedType === cellEnum.wall) {
      if (posEq(W, pos)) newPremoveActions = [];
      else if (actCount === 1) newPremoveActions = [W, pos];
      else return;
    } else if (selectedType === cellEnum.ground) {
      if (actCount === 1) newPremoveActions = [W, pos];
      else return;
    }
  } else if (premoveState === premoveEnum.wallWall) {
    if (selectedType === cellEnum.wall) {
      if (posEq(W, pos)) newPremoveActions = [W2];
      else if (posEq(W2, pos)) newPremoveActions = [W];
      else return;
    } else if (selectedType === cellEnum.ground) {
      return;
    }
  } else if (premoveState === premoveEnum.groundDist1) {
    if (selectedType === cellEnum.wall) {
      if (actCount === 1) newPremoveActions = [premoveGround, pos];
      else return;
    } else if (selectedType === cellEnum.ground) {
      if (posEq(pos, premoveGround)) newPremoveActions = [];
      else newPremoveActions = [pos];
    }
  } else if (premoveState === premoveEnum.groundDist2) {
    if (selectedType === cellEnum.wall) return;
    else if (selectedType === cellEnum.ground) {
      if (posEq(pos, premoveGround)) newPremoveActions = [];
      else newPremoveActions = [pos];
    }
  } else if (premoveState === premoveEnum.groundWall) {
    if (selectedType === cellEnum.wall) {
      if (posEq(pos, W)) newPremoveActions = [premoveGround];
      else return;
    } else if (selectedType === cellEnum.ground) {
      if (posEq(pos, premoveGround)) newPremoveActions = [W];
      else if (actCount === 1) newPremoveActions = [W, pos];
      else return;
    }
  } else {
    console.error("unexpected premove state case", premoveState);
  }
  if (newPremoveActions) draftState.premoveActions = newPremoveActions;
};

const closeDialogs = (draftState) => {
  draftState.showRematchDialog = false;
  draftState.showDrawDialog = false;
  draftState.showTakebackDialog = false;
  draftState.ghostAction = null;
  draftState.premoveActions = [];
};

export const applyDrawGame = (draftState, finishReason) => {
  if (draftState.lifeCycleStage !== 3) return;
  draftState.shouldPlaySound = true;
  draftState.lifeCycleStage = 4;
  draftState.winner = "draw";
  draftState.matchScore[0] += 0.5;
  draftState.matchScore[1] += 0.5;
  draftState.finishReason = finishReason;
  closeDialogs(draftState);
};

export const applyResignGame = (draftState, resignerIsCreator) => {
  if (draftState.lifeCycleStage !== 3) return;
  draftState.lifeCycleStage = 4;
  draftState.winner = resignerIsCreator ? roleEnum.joiner : roleEnum.creator;
  draftState.matchScore[resignerIsCreator ? 1 : 0]++;
  draftState.finishReason = "resign";
  closeDialogs(draftState);
};

export const applyAbandonGame = (draftState, abandonerIsCreator) => {
  if (draftState.lifeCycleStage === 4) return;
  draftState.lifeCycleStage = 4;
  draftState.winner = abandonerIsCreator ? roleEnum.joiner : roleEnum.creator;
  draftState.matchScore[abandonerIsCreator ? 1 : 0]++;
  draftState.finishReason = "abandon";
  closeDialogs(draftState);
};

export const applyTakeback = (draftState, requesterIsCreator) => {
  draftState.showTakebackDialog = false;
  if (draftState.lifeCycleStage !== 2 && draftState.lifeCycleStage !== 3)
    return;
  const requesterToMove = requesterIsCreator === creatorToMove(draftState);
  const numMovesToUndo = requesterToMove ? 2 : 1;
  for (let k = 0; k < numMovesToUndo; k++) draftState.moveHistory.pop();
  const tc = turnCount(draftState);
  draftState.viewIndex = tc;
  if (tc === 0) draftState.lifeCycleStage = 1;
  else if (tc === 1) draftState.lifeCycleStage = 2;
  closeDialogs(draftState);
};

// Unlike a normal takeback, this can take back a move that ends the game.
export const applyPuzzleTakeback = (draftState, requesterIsCreator) => {
  const requesterToMove = requesterIsCreator === creatorToMove(draftState);
  const numMovesToUndo = requesterToMove ? 2 : 1;
  for (let k = 0; k < numMovesToUndo; k++) draftState.moveHistory.pop();
  const tc = turnCount(draftState);
  draftState.viewIndex = tc;
  if (tc === 0) draftState.lifeCycleStage = 1;
  else if (tc === 1) draftState.lifeCycleStage = 2;
  draftState.matchScore = [0, 0];
};

export const applyNewRatingsNotification = (draftState, ratings) => {
  draftState.ratings = ratings;
};

export const applySetupRematch = (draftState) => {
  if (draftState.lifeCycleStage !== 4) return;
  draftState.creatorStarts = !draftState.creatorStarts;

  const newGrid = emptyGrid(draftState.boardSettings.dims);
  draftState.moveHistory = [
    {
      index: 0,
      actions: [],
      grid: newGrid,
      playerPos: draftState.boardSettings.startPos,
      timeLeft: [
        draftState.timeControl.duration * 60,
        draftState.timeControl.duration * 60,
      ],
      distances: [
        distance(
          newGrid,
          draftState.boardSettings.startPos[0],
          draftState.boardSettings.goalPos[0]
        ),
        distance(
          newGrid,
          draftState.boardSettings.startPos[1],
          draftState.boardSettings.goalPos[1]
        ),
      ],
      wallCounts: [0, 0],
    },
  ];
  draftState.winner = "";
  draftState.finishReason = "";
  draftState.lifeCycleStage = 1;
  draftState.viewIndex = 0;
  closeDialogs(draftState);
};

export const applyAddExtraTime = (draftState, playerIndex) => {
  if (draftState.lifeCycleStage !== 3) return;
  const tc = turnCount(draftState);
  draftState.moveHistory[tc].timeLeft[playerIndex] += 60;
};

const applyWonOnTime = (draftState, winnerIndex) => {
  draftState.winner = winnerIndex === 0 ? roleEnum.creator : roleEnum.joiner;
  draftState.matchScore[winnerIndex]++;
  draftState.finishReason = "time";
  draftState.lifeCycleStage = 4;
  closeDialogs(draftState);
};

export const applyClockTick = (draftState) => {
  //clocks only run after each player have made the first move,
  //and the game has not ended
  if (draftState.lifeCycleStage !== 3) return;
  const idx = indexToMove(draftState);
  const tc = turnCount(draftState);
  draftState.moveHistory[tc].timeLeft[idx]--;
  if (draftState.moveHistory[tc].timeLeft[idx] === 0) {
    draftState.shouldPlaySound = true;
    applyWonOnTime(draftState, idx === 0 ? 1 : 0);
  }
};
