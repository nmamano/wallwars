import cloneDeep from "lodash.clonedeep";
import { Cookies } from "../App";
import {
  Pos,
  Move,
  BoardSettings,
  Grid,
  MoveHistory,
  TimeControl,
  cellTypeByPos,
  posEq,
  emptyGrid,
  distance,
  isDistanceAtMost,
  canBuildWall,
  emptyBoardDistances,
  CellType,
  GameSpec,
} from "../shared/gameLogicUtils";
import {
  defaultBoardSettings,
  defaultGoalPos,
  defaultInitialPlayerPos,
} from "../shared/globalSettings";
import {
  Puzzle,
  parsePuzzleMoveList,
  puzzleBoardSettingsToInternalBoardSettings,
} from "./puzzleLogic";

/* This file contains functions that modify a copy of the state of GamePage
the state itself is immutable, as per the react philosophy, but we can
make changes to a copy of it (called 'draftState' below)
the 'Immer' state manager takes care of updating the actual state. */

export enum RoleEnum {
  none = "",
  creator = "creator",
  joiner = "joiner",
  spectator = "spectator",
  returner = "returner",
  offline = "offline",
  computer = "computer",
  puzzle = "puzzle",
  uploaded = "uploaded",
}

export enum WinnerEnum {
  None = "",
  Creator = "creator",
  Joiner = "joiner",
  Draw = "draw",
}

export enum FinishReason {
  None = "",
  Agreement = "agreement",
  Goal = "goal",
  Time = "time",
  Resign = "resign",
  Abandon = "abandon",
}

// Todo: use an enum.
export type LifeCycleStage =
  | -2 // Before sending 'createGame'/'joinGame' (for creator/joiner) to the server.
  | -1 // Before receiving 'gameCreated'/'gameJoined' (for creator/joiner) from the server.
  | 0 // Game created on server, but joiner not joined yet (only creator goes into this stage).
  | 1 // Joiner joined, but no moves made yet. Clocks not ticking.
  | 2 // One player moved. Clocks still not ticking.
  | 3 // Both players made at least 1 move and game has not ended. Clocks are ticking.
  | 4; // Game ended because a win/draw condition is reached.

// A move in a game received from the server.
export type ServerMoveInHistory = {
  actions: Move;
  remainingTime: number;
  distances: [number, number];
};

// A game received from the server.
export type ServerGame = {
  _id: string;
  timeControl: TimeControl;
  boardSettings: BoardSettings;
  playerNames: [string, string];
  playerTokens: [string, string];
  joinCode: string;
  creatorStarts: boolean;
  ratings: [number, number];
  moveHistory: ServerMoveInHistory[];
  matchScore: [number, number];
  winner: WinnerEnum;
  finishReason: FinishReason;
  arePlayersPresent: [boolean, boolean];
  isRated: boolean;
};

export type GameState = {
  //===================================================
  // State about the session (sequence of games played by rematching).
  //===================================================
  // Game code used by the joiner to join the game.
  joinCode: string | null;
  timeControl: TimeControl | null;
  names: [string | null, string | null];
  // The icon used for the players. The "default" icon is special in that it is
  // different for the creator and joiner.
  tokens: [string, string];
  // How many games each player has won in this session.
  matchScore: [number, number];

  // Players can return to a game even if they close the browser
  // (as long as they use the same id token) but if they create/join another
  // game, this counts as abandonment and they cannot join anymore.
  opponentAbandoned: boolean;

  // Indicates if the players have the game page open.
  // The game goes on even if both leave, but actions that require both
  // players to agree are disabled if one of the players is not present
  // eg., agreeing to a draw, starting a rematch, or doing a takeback.
  arePlayersPresent: [boolean, boolean];

  //===================================================
  // State of the current game.
  //===================================================
  // Who starts is decided by the server, null means that we do not know yet.
  creatorStarts: boolean | null;

  winner: WinnerEnum;
  finishReason: FinishReason;
  lifeCycleStage: LifeCycleStage;
  moveHistory: MoveHistory;
  ratings: [number, number];

  //===================================================
  // State unique to this client.
  //===================================================
  // One of: "", "creator", "joiner", "spectator".
  clientRole: RoleEnum | null;

  // A move to be sent to the other client is stored here temporarily.
  // null means that there is no move to send.
  moveToSend: ServerMoveInHistory | null;

  // A ghost action is a single action done and shown only to this client
  // when it is this client's turn to move. it can be combined with another
  // action to make a full move, or undone in order to choose a different action.
  // null means that the player has not made a ghost action.
  ghostAction: Pos | null;

  // Premove actions are one or two actions done by this client when it is not
  // this client's turn to move. Once the opponent moves, the game behaves as if
  // the client inputted the premove actions during their turn.
  premoveActions: Pos[];

  isVolumeOn: boolean;
  // Events that trigger a sound set this to true. It is set back to false when
  // the sound is played.
  shouldPlaySound: boolean;

  isKeyPressed: boolean;

  // Index of the move that the client is looking at, which may not be the last one.
  viewIndex: number;
  zoomLevel: number; // From 0 to 10.

  // The client pings the server periodically to make sure the server is alive.
  // 'waitingForPing' is increased every 'pingInterval' seconds.
  // It is reset to 0 at every server message. A ping message is sent if waitingForPing
  // reaches 2 (meaning, it has gone at least 'pingInterval' seconds without hearing
  // from server). A warning is displayed to the user if it reaches 3 saying the server
  // is probably unreachable.
  waitingForPing: number;

  // Where the player needs to make a decision through a dialog, one of these options is set to
  // true. It is set back to false when the dialog is closed.
  showDrawDialog: boolean;
  showTakebackDialog: boolean;
  showRematchDialog: boolean;

  boardSettings: BoardSettings;
  isRated: boolean;
};

// =================================
// Pure utility functions.
// =================================

// A constructor-like function for GameState.
export function createInitialState(cookies: Cookies): GameState {
  const draftState: GameState = {
    joinCode: null,
    timeControl: null,
    names: [null, null],
    tokens: ["default", "default"],
    matchScore: [0, 0],
    opponentAbandoned: false,
    arePlayersPresent: [false, false],
    creatorStarts: null,
    winner: WinnerEnum.None,
    finishReason: FinishReason.None,
    lifeCycleStage: -2,

    // Move at index 0 is the initial position (not an actual move).
    moveHistory: [
      {
        index: 0,
        actions: [],
        grid: emptyGrid(defaultBoardSettings.dims),
        playerPos: defaultBoardSettings.startPos,
        timeLeft: [null, null],
        distances: emptyBoardDistances(defaultBoardSettings),
        wallCounts: [0, 0],
      },
    ],
    ratings: [0, 0],
    clientRole: null,
    moveToSend: null,
    ghostAction: null,
    premoveActions: [],
    isVolumeOn: false,
    shouldPlaySound: false,
    isKeyPressed: false,
    viewIndex: 0,
    zoomLevel: 5,
    waitingForPing: 0,
    showDrawDialog: false,
    showTakebackDialog: false,
    showRematchDialog: false,

    // By default, startPos and goalPos are at the corners.
    boardSettings: defaultBoardSettings,
    isRated: false,
  };
  applyCookieSettings(draftState, cookies);
  return draftState;
}

export function turnCount(state: GameState): number {
  return state.moveHistory.length - 1;
}

export function creatorToMove(state: GameState): boolean {
  return turnCount(state) % 2 === (state.creatorStarts ? 0 : 1);
}

export function creatorToMoveAtIndex(state: GameState): boolean {
  return state.viewIndex % 2 === (state.creatorStarts ? 0 : 1);
}

export function indexToMove(state: GameState): 0 | 1 {
  return creatorToMove(state) ? 0 : 1;
}

export function ghostType(pos: Pos): "None" | CellType {
  return pos === null ? "None" : cellTypeByPos(pos);
}

export function isOpponentPresent(state: GameState): boolean {
  return state.arePlayersPresent[state.clientRole === RoleEnum.creator ? 1 : 0];
}

// The previous position of the player, if they moved in the last turn
// (based on the current move index, not the last move played).
export function getTracePos(state: GameState): Pos | null {
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
}

export function applyAddCreator({
  draftState,
  timeControl,
  boardSettings,
  name,
  token,
  isRated,
}: {
  draftState: GameState;
  timeControl: TimeControl;
  boardSettings: BoardSettings;
  name: string;
  token: string;
  isRated: boolean;
}): void {
  draftState.clientRole = RoleEnum.creator;
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
  draftState.isRated = isRated;
}

export function applyAddJoiner({
  draftState,
  joinCode,
  name,
  token,
}: {
  draftState: GameState;
  joinCode: string;
  name: string;
  token: string;
}): void {
  draftState.clientRole = RoleEnum.joiner;
  draftState.lifeCycleStage = -1;
  draftState.joinCode = joinCode;
  draftState.names[1] = name;
  draftState.tokens[1] = token;
}

// Data sent by the server to the creator.
export function applyCreatedOnServer({
  draftState,
  joinCode,
  creatorStarts,
  rating,
}: {
  draftState: GameState;
  joinCode: string;
  creatorStarts: boolean;
  rating: number;
}) {
  // If life cycle stage is already 0, it means we already processed the response.
  if (draftState.lifeCycleStage === 0) return;
  draftState.joinCode = joinCode;
  draftState.creatorStarts = creatorStarts;
  draftState.lifeCycleStage = 0;
  draftState.ratings[0] = rating;
}

// Data sent by the server to the joiner.
export function applyJoinedOnServer({
  draftState,
  creatorName,
  creatorToken,
  timeControl,
  boardSettings,
  creatorStarts,
  creatorPresent,
  creatorRating,
  joinerRating,
  isRated,
}: {
  draftState: GameState;
  creatorName: string;
  creatorToken: string;
  timeControl: TimeControl;
  boardSettings: BoardSettings;
  creatorStarts: boolean;
  creatorPresent: boolean;
  creatorRating: number;
  joinerRating: number;
  isRated: boolean;
}): void {
  // If life cycle stage is already 1, it means we already joined.
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
  draftState.isRated = isRated;
}

export function applyJoinerJoined({
  draftState,
  joinerName,
  joinerToken,
  joinerRating,
}: {
  draftState: GameState;
  joinerName: string;
  joinerToken: string;
  joinerRating: number;
}): void {
  // If life cycle stage is already 1, it means the joiner already joined.
  if (draftState.lifeCycleStage === 1) return;
  draftState.names[1] = joinerName;
  draftState.tokens[1] = joinerToken;
  draftState.lifeCycleStage = 1;
  draftState.ratings[1] = joinerRating;
}

export function applyCreatedLocally({
  draftState,
  timeControl,
  boardSettings,
  name,
  token,
}: {
  draftState: GameState;
  timeControl: TimeControl;
  boardSettings: BoardSettings;
  name: string;
  token: string;
}): void {
  applyAddCreator({
    draftState,
    timeControl,
    boardSettings,
    name: name + "1",
    token,
    isRated: false,
  });
  applyCreatedOnServer({
    draftState,
    joinCode: "local",
    creatorStarts: true,
    rating: 0,
  });
  applyJoinerJoined({
    draftState,
    joinerName: name + "2",
    joinerToken: "cloud_off",
    joinerRating: 0,
  });
}

export function applyCreatedVsComputer({
  draftState,
  boardSettings,
  name,
  token,
}: {
  draftState: GameState;
  boardSettings: BoardSettings;
  name: string;
  token: string;
}): void {
  const timeControl = {
    duration: 60,
    increment: 0,
  };
  applyAddCreator({
    draftState,
    timeControl,
    boardSettings,
    name,
    token,
    isRated: false,
  });
  applyCreatedOnServer({
    draftState,
    joinCode: "AI",
    creatorStarts: true,
    rating: 0,
  });
  applyJoinerJoined({
    draftState,
    joinerName: "AI",
    joinerToken: "memory",
    joinerRating: 0,
  });
}

export function applyCreatedPuzzle({
  draftState,
  name,
  token,
  puzzle,
}: {
  draftState: GameState;
  name: string;
  token: string;
  puzzle: Puzzle;
}): void {
  const timeControl = {
    duration: 60,
    increment: 0,
  };
  applyAddCreator({
    draftState,
    timeControl,
    boardSettings: puzzleBoardSettingsToInternalBoardSettings(
      puzzle.boardSettings
    ),
    name: puzzle.playAsCreator ? name : puzzle.author,
    token: puzzle.playAsCreator ? token : "extension",
    isRated: false,
  });
  applyCreatedOnServer({
    draftState,
    joinCode: "Puzzle",
    creatorStarts: puzzle.creatorStarts,
    rating: 0,
  });
  applyJoinerJoined({
    draftState,
    joinerName: !puzzle.playAsCreator ? name : puzzle.author,
    joinerToken: !puzzle.playAsCreator ? token : "extension",
    joinerRating: 0,
  });
  const moves = parsePuzzleMoveList(puzzle.moves);
  // Play setup moves:
  for (let i = 0; i < puzzle.startIndex; i++) {
    applyMove(draftState, moves[i][0], 60 * 60, i + 1);
  }
}

export function applyPuzzleMove(draftState: GameState, puzzle: Puzzle): void {
  const tc = turnCount(draftState);
  const actions = parsePuzzleMoveList(puzzle.moves)[tc][0];
  applyMove(draftState, actions, 60 * 60, tc + 1);
}

export function applyUploadedGame({
  draftState,
  gameSpec,
}: {
  draftState: GameState;
  gameSpec: GameSpec;
}): void {
  const timeControl = {
    duration: 60,
    increment: 0,
  };
  const internalRows = gameSpec.rows * 2 - 1;
  const internalCols = gameSpec.columns * 2 - 1;
  const boardSettings: BoardSettings = {
    dims: [internalRows, internalCols],
    startPos: defaultInitialPlayerPos([internalRows, internalCols]),
    goalPos: defaultGoalPos([internalRows, internalCols]),
  };

  applyAddCreator({
    draftState,
    timeControl,
    boardSettings: boardSettings,
    name: gameSpec.creator === "" ? "Anon" : gameSpec.creator,
    token: "default",
    isRated: false,
  });
  applyCreatedOnServer({
    draftState,
    joinCode: "Uploaded",
    creatorStarts: true,
    rating: 0,
  });
  applyJoinerJoined({
    draftState,
    joinerName: gameSpec.joiner === "" ? "Anon" : gameSpec.joiner,
    joinerToken: "default",
    joinerRating: 0,
  });
  // Play setup moves:
  for (let i = 0; i < gameSpec.moves.length; i++) {
    applyMove(draftState, gameSpec.moves[i], 60 * 60, i + 1);
  }
}

export function applyReturnToGame(
  draftState: GameState,
  serverGame: ServerGame,
  isCreator: boolean,
  timeLeft: [number, number]
): void {
  // If game is already initialized, don't return to game again.
  if (draftState.timeControl) return;
  const clientRole = isCreator ? RoleEnum.creator : RoleEnum.joiner;
  if (clientRole === RoleEnum.creator) {
    applyAddCreator({
      draftState,
      timeControl: serverGame.timeControl,
      boardSettings: serverGame.boardSettings,
      name: serverGame.playerNames[0],
      token: serverGame.playerTokens[0],
      isRated: serverGame.isRated,
    });
    applyCreatedOnServer({
      draftState,
      joinCode: serverGame.joinCode,
      creatorStarts: serverGame.creatorStarts,
      rating: serverGame.ratings[0],
    });
    applyJoinerJoined({
      draftState,
      joinerName: serverGame.playerNames[1],
      joinerToken: serverGame.playerTokens[1],
      joinerRating: serverGame.ratings[1],
    });
  } else {
    applyAddJoiner({
      draftState,
      joinCode: serverGame.joinCode,
      name: serverGame.playerNames[1],
      token: serverGame.playerTokens[1],
    });
    applyJoinedOnServer({
      draftState,
      creatorName: serverGame.playerNames[0],
      creatorToken: serverGame.playerTokens[0],
      timeControl: serverGame.timeControl,
      boardSettings: serverGame.boardSettings,
      creatorStarts: serverGame.creatorStarts,
      creatorPresent: true,
      creatorRating: serverGame.ratings[0],
      joinerRating: serverGame.ratings[1],
      isRated: serverGame.isRated,
    });
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
}

export function applyReceivedGame(
  draftState: GameState,
  serverGame: ServerGame
): void {
  applyAddCreator({
    draftState,
    timeControl: serverGame.timeControl,
    boardSettings: serverGame.boardSettings,
    name: serverGame.playerNames[0],
    token: serverGame.playerTokens[0],
    isRated: serverGame.isRated,
  });
  applyCreatedOnServer({
    draftState,
    joinCode: serverGame.joinCode,
    creatorStarts: serverGame.creatorStarts,
    rating: serverGame.ratings[0],
  });
  applyJoinerJoined({
    draftState,
    joinerName: serverGame.playerNames[1],
    joinerToken: serverGame.playerTokens[1],
    joinerRating: serverGame.ratings[1],
  });
  for (let k = 0; k < serverGame.moveHistory.length; k++) {
    const actions = serverGame.moveHistory[k].actions;
    const tLeft = serverGame.moveHistory[k].remainingTime;
    applyMove(draftState, actions, tLeft, k + 1);
  }
  draftState.clientRole = RoleEnum.spectator;
  draftState.matchScore = serverGame.matchScore;
  draftState.winner = serverGame.winner;
  draftState.finishReason = serverGame.finishReason;
  draftState.lifeCycleStage = 4;
}

// Applies the move number 'moveIndex', consisting of the action(s) in 'actions',
// 'timeLeftAfterMove' is the time left by the player who made the move.
export function applyMove(
  draftState: GameState,
  actions: Move,
  timeLeftAfterMove: number,
  moveIndex: number
): void {
  // Only in life cycle stages 1, 2, and 3 players can make move.
  if (draftState.lifeCycleStage < 1 || draftState.lifeCycleStage > 3) return;
  // Make the move only if it is the next one (safety measure against desync issues).
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
    if (aType === CellType.ground) {
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
          draftState.winner = WinnerEnum.Draw;
          draftState.matchScore[0] += 0.5;
          draftState.matchScore[1] += 0.5;
        } else {
          draftState.winner =
            idxToMove === 0 ? WinnerEnum.Creator : WinnerEnum.Joiner;
          draftState.matchScore[idxToMove]++;
        }
        draftState.finishReason = FinishReason.Goal;
        draftState.lifeCycleStage = 4;
      }
    } else if (aType === CellType.wall) {
      newGrid[aPos[0]][aPos[1]] = (idxToMove + 1) as 1 | 2;
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

  // Ghost actions are cleared when a move actually happens.
  draftState.ghostAction = null;

  // If the player is looking at a previous move, when a move happens
  // they are automatically switched to viewing the new move.
  draftState.viewIndex = tc + 1;

  // Apply premoves, if any.
  if (draftState.premoveActions.length > 0) {
    const acts = draftState.premoveActions;
    draftState.premoveActions = [];
    for (let k = 0; k < acts.length; k++)
      applySelectedCell(draftState, acts[k], true);
  }
}

// Manage the state change on click or keyboard press. this may
// change the ghost action (which is only shown to this client), or
// make a full move, in which case it is also sent to the other client.
export function applySelectedCell(
  draftState: GameState,
  pos: Pos,
  clientToMove: boolean
): void {
  if (!clientToMove) {
    applySelectedCellPremove(draftState, pos);
    return;
  }
  if (draftState.lifeCycleStage < 1) return; // Cannot move until joiner joins.
  if (draftState.lifeCycleStage > 3) return; // Cannot move if game finished.
  // Can only move if looking at current position.
  if (draftState.viewIndex !== turnCount(draftState)) return;
  // Out of bounds position, can happen when using the keyboard keys.
  const dims = draftState.boardSettings.dims;
  if (pos[0] < 0 || pos[0] >= dims[0] || pos[1] < 0 || pos[1] >= dims[1])
    return;

  const selectedType = cellTypeByPos(pos);
  const idx = indexToMove(draftState);
  const otherIdx = idx === 0 ? 1 : 0;
  const gType = ghostType(draftState.ghostAction!);
  const extraWalls = gType === CellType.wall ? [draftState.ghostAction!] : [];
  const tc = turnCount(draftState);
  let curPos = draftState.moveHistory[tc].playerPos[idx];
  if (selectedType === CellType.wall && gType === CellType.ground)
    curPos = draftState.ghostAction!;
  const actCount = countActions({
    grid: draftState.moveHistory[tc].grid,
    selectedPos: pos,
    posActor: curPos,
    posOther: draftState.moveHistory[tc].playerPos[otherIdx],
    goalActor: draftState.boardSettings.goalPos[idx],
    goalOther: draftState.boardSettings.goalPos[otherIdx],
    extraWalls,
  });
  if (actCount > 2) return; // Clicked a ground cell at distance >2.

  // Variables to store the outcome of the click, if any.
  // In the case analysis below, if we detect that the click does
  // not trigger any change, we simply return.
  // See docs/moveLogic.md for the description of the case analysis.
  let [fullMoveActions, newGhostAction]: [
    null | [Pos] | [Pos, Pos],
    Pos | null
  ] = [null, null];
  if (gType === "None") {
    if (selectedType === CellType.wall) {
      if (actCount === 1) newGhostAction = pos;
      else return;
    } else if (selectedType === CellType.ground) {
      if (actCount === 1) newGhostAction = pos;
      else if (actCount === 2) fullMoveActions = [pos];
      else return;
    }
  } else if (gType === CellType.wall) {
    if (selectedType === CellType.wall) {
      if (posEq(draftState.ghostAction!, pos)) newGhostAction = null;
      else if (actCount === 1) fullMoveActions = [pos, draftState.ghostAction!];
      else return;
    } else if (selectedType === CellType.ground) {
      if (actCount === 0) newGhostAction = null;
      else if (actCount === 1) fullMoveActions = [pos, draftState.ghostAction!];
      else return;
    }
  } else if (gType === CellType.ground) {
    if (selectedType === CellType.wall) {
      if (actCount === 1) fullMoveActions = [pos, draftState.ghostAction!];
      else return;
    } else if (selectedType === CellType.ground) {
      if (actCount === 0) newGhostAction = null;
      else if (actCount === 1) {
        if (posEq(pos, draftState.ghostAction!)) newGhostAction = null;
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
    let tLeft = draftState.moveHistory[tc].timeLeft[idx]!;
    // We don't add the increment until the clocks start running (stage 3).
    if (draftState.lifeCycleStage === 3)
      tLeft += draftState.timeControl!.increment;
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
}

export function applyDrawGame(
  draftState: GameState,
  finishReason: FinishReason
): void {
  if (draftState.lifeCycleStage !== 3) return;
  draftState.shouldPlaySound = true;
  draftState.lifeCycleStage = 4;
  draftState.winner = WinnerEnum.Draw;
  draftState.matchScore[0] += 0.5;
  draftState.matchScore[1] += 0.5;
  draftState.finishReason = finishReason;
  closeDialogs(draftState);
}

export function applyResignGame(
  draftState: GameState,
  resignerIsCreator: boolean
): void {
  if (draftState.lifeCycleStage !== 3) return;
  draftState.lifeCycleStage = 4;
  draftState.winner = resignerIsCreator
    ? WinnerEnum.Joiner
    : WinnerEnum.Creator;
  draftState.matchScore[resignerIsCreator ? 1 : 0]++;
  draftState.finishReason = FinishReason.Resign;
  closeDialogs(draftState);
}

export function applyAbandonGame(
  draftState: GameState,
  abandonerIsCreator: boolean
): void {
  if (draftState.lifeCycleStage === 4) return;
  draftState.lifeCycleStage = 4;
  draftState.winner = abandonerIsCreator
    ? WinnerEnum.Joiner
    : WinnerEnum.Creator;
  draftState.matchScore[abandonerIsCreator ? 1 : 0]++;
  draftState.finishReason = FinishReason.Abandon;
  closeDialogs(draftState);
}

export function applyTakeback(
  draftState: GameState,
  requesterIsCreator: boolean
): void {
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
}

// Unlike a normal takeback, this can take back a move that ends the game.
export function applyPuzzleTakeback(
  draftState: GameState,
  requesterIsCreator: boolean
): void {
  const requesterToMove = requesterIsCreator === creatorToMove(draftState);
  const numMovesToUndo = requesterToMove ? 2 : 1;
  for (let k = 0; k < numMovesToUndo; k++) draftState.moveHistory.pop();
  const tc = turnCount(draftState);
  draftState.viewIndex = tc;
  if (tc === 0) draftState.lifeCycleStage = 1;
  else if (tc === 1) draftState.lifeCycleStage = 2;
  draftState.matchScore = [0, 0];
}

export function applyNewRatingsNotification(
  draftState: GameState,
  ratings: [number, number]
): void {
  draftState.ratings = ratings;
}

export function applySetupRematch(draftState: GameState): void {
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
        draftState.timeControl!.duration * 60,
        draftState.timeControl!.duration * 60,
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
  draftState.winner = WinnerEnum.None;
  draftState.finishReason = FinishReason.None;
  draftState.lifeCycleStage = 1;
  draftState.viewIndex = 0;
  closeDialogs(draftState);
}

export function applyAddExtraTime(
  draftState: GameState,
  playerIndex: number
): void {
  if (draftState.lifeCycleStage !== 3) return;
  const tc = turnCount(draftState);
  draftState.moveHistory[tc].timeLeft[playerIndex]! += 60;
}

export function applyClockTick(draftState: GameState): void {
  //clocks only run after each player have made the first move,
  //and the game has not ended
  if (draftState.lifeCycleStage !== 3) return;
  const idx = indexToMove(draftState);
  const tc = turnCount(draftState);
  draftState.moveHistory[tc].timeLeft[idx]!--;
  if (draftState.moveHistory[tc].timeLeft[idx] === 0) {
    draftState.shouldPlaySound = true;
    applyWonOnTime(draftState, idx === 0 ? 1 : 0);
  }
}

// =================================
// Internal functions.
// =================================

// When the player selects a cell, it can trigger a different
// umber of actions (1 action: build 1 wall or move 1 step).
// This function counts the number of actions for a selected position.
function countActions({
  grid,
  selectedPos,
  posActor,
  posOther,
  goalActor,
  goalOther,
  extraWalls,
}: {
  grid: Grid;
  selectedPos: Pos;
  posActor: Pos;
  posOther: Pos;
  goalActor: Pos;
  goalOther: Pos;
  // Walls that are not in grid but should be considered as if they were.
  extraWalls: Pos[];
}): number {
  const gridCopy = cloneDeep(grid);
  for (let k = 0; k < extraWalls.length; k++) {
    const W = extraWalls[k];
    gridCopy[W[0]][W[1]] = 1;
  }
  if (cellTypeByPos(selectedPos) === CellType.ground) {
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
}

function applyCookieSettings(draftState: GameState, cookies: Cookies) {
  if (!cookies) return;
  if (cookies.isVolumeOn && cookies.isVolumeOn === "true")
    draftState.isVolumeOn = true;
  if (cookies.zoomLevel) {
    const zoomVal = parseInt(cookies.zoomLevel);
    if (zoomVal >= 0 && zoomVal <= 10) draftState.zoomLevel = zoomVal;
  }
}

// Manage the state change on click or keyboard press.
// Dual function of applySelectedCell for when it's not your turn
function applySelectedCellPremove(draftState: GameState, pos: Pos): void {
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
  let premoveGround: Pos | null = null;
  for (let k = 0; k < draftState.premoveActions.length; k++) {
    const act = draftState.premoveActions[k];
    if (cellTypeByPos(act) === CellType.wall) premoveWalls.push(act);
    else premoveGround = act;
  }
  let curPos = draftState.moveHistory[tc].playerPos[idx];
  if (selectedType === CellType.wall && premoveGround) curPos = premoveGround;
  const actCount = countActions({
    grid: draftState.moveHistory[tc].grid,
    selectedPos: pos,
    posActor: curPos,
    posOther: draftState.moveHistory[tc].playerPos[otherIdx],
    goalActor: draftState.boardSettings.goalPos[idx],
    goalOther: draftState.boardSettings.goalPos[otherIdx],
    extraWalls: premoveWalls,
  });
  let premoveGroundDist = null;
  if (premoveGround)
    premoveGroundDist = countActions({
      grid: draftState.moveHistory[tc].grid,
      selectedPos: premoveGround,
      posActor: draftState.moveHistory[tc].playerPos[idx],
      posOther: draftState.moveHistory[tc].playerPos[otherIdx],
      goalActor: draftState.boardSettings.goalPos[idx],
      goalOther: draftState.boardSettings.goalPos[otherIdx],
      extraWalls: premoveWalls,
    });

  if (actCount > 2) return;

  //see docs/moveLogic.md for the description of the case analysis below
  const premoveEnum = {
    empty: "empty",
    wall: "wall",
    wallWall: "wallWall",
    groundWall: "groundWall",
    groundDist1: "groundDist1",
    groundDist2: "groundDist2",
  } as const;
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

  let newPremoveActions: Pos[] = [];
  if (posEq(pos, curPos)) {
    if (draftState.premoveActions.length === 0) return;
    else {
      //selecting the current position undoes any premoves
      draftState.premoveActions = [];
      return;
    }
  }

  let [W, W2]: [Pos | null, Pos | null] = [null, null];
  if (premoveWalls.length === 1) [W, W2] = [premoveWalls[0], null];
  else if (premoveWalls.length === 2)
    [W, W2] = [premoveWalls[0], premoveWalls[1]];
  if (premoveState === premoveEnum.empty) {
    if (selectedType === CellType.wall) {
      if (actCount === 1) newPremoveActions = [pos];
      else return;
    } else if (selectedType === CellType.ground) {
      if (actCount === 1 || actCount === 2) newPremoveActions = [pos];
      else console.error("unreachable case");
    }
  } else if (premoveState === premoveEnum.wall) {
    if (selectedType === CellType.wall) {
      if (posEq(W!, pos)) newPremoveActions = [];
      else if (actCount === 1) newPremoveActions = [W!, pos];
      else return;
    } else if (selectedType === CellType.ground) {
      if (actCount === 1) newPremoveActions = [W!, pos];
      else return;
    }
  } else if (premoveState === premoveEnum.wallWall) {
    if (selectedType === CellType.wall) {
      if (posEq(W!, pos)) newPremoveActions = [W2!];
      else if (posEq(W2!, pos)) newPremoveActions = [W!];
      else return;
    } else if (selectedType === CellType.ground) {
      return;
    }
  } else if (premoveState === premoveEnum.groundDist1) {
    if (selectedType === CellType.wall) {
      if (actCount === 1) newPremoveActions = [premoveGround!, pos];
      else return;
    } else if (selectedType === CellType.ground) {
      if (posEq(pos, premoveGround!)) newPremoveActions = [];
      else newPremoveActions = [pos];
    }
  } else if (premoveState === premoveEnum.groundDist2) {
    if (selectedType === CellType.wall) return;
    else if (selectedType === CellType.ground) {
      if (posEq(pos, premoveGround!)) newPremoveActions = [];
      else newPremoveActions = [pos];
    }
  } else if (premoveState === premoveEnum.groundWall) {
    if (selectedType === CellType.wall) {
      if (posEq(pos, W!)) newPremoveActions = [premoveGround!];
      else return;
    } else if (selectedType === CellType.ground) {
      if (posEq(pos, premoveGround!)) newPremoveActions = [W!];
      else if (actCount === 1) newPremoveActions = [W!, pos];
      else return;
    }
  } else {
    console.error("unexpected premove state case", premoveState);
  }
  if (newPremoveActions) draftState.premoveActions = newPremoveActions;
}

function closeDialogs(draftState: GameState): void {
  draftState.showRematchDialog = false;
  draftState.showDrawDialog = false;
  draftState.showTakebackDialog = false;
  draftState.ghostAction = null;
  draftState.premoveActions = [];
}

function applyWonOnTime(draftState: GameState, winnerIndex: number): void {
  draftState.winner =
    winnerIndex === 0 ? WinnerEnum.Creator : WinnerEnum.Joiner;
  draftState.matchScore[winnerIndex]++;
  draftState.finishReason = FinishReason.Time;
  draftState.lifeCycleStage = 4;
  closeDialogs(draftState);
}
