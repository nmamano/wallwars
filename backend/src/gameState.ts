/* this file contains functions that modify the state of the game
Note that the server's representation of a game is different than
the client's representation */

export type TimeControl = {
  duration: number;
  increment: number;
};

export type BoardSettings = {};

export type Move = {
  timestamp: string;
  remainingTime: number;
  actions: string[];
  distances: [number, number];
};

export type GameState = {
  joinCode: string;
  matchScore: [number, number];
  socketIds: [string | null, string | null];
  idTokens: [string, string];
  playerNames: [string | null, string | null];
  playerTokens: [string, string];
  timeControl: TimeControl | null;
  boardSettings: BoardSettings | null;
  arePlayersPresent: [boolean, boolean];
  creatorStarts: boolean;
  moveHistory: Move[];
  winner: "" | "creator" | "joiner" | "draw";
  finishReason: "" | "goal" | "agreement" | "time" | "resign" | "abandon";
  creationDate: Date | null;
  startDate: Date | null;
  isPublic: boolean;
  numSpectators: number;
  version: "1.0";
  finalDists: [number, number];
  numMoves: number;
  ratings: [number, number];
};

//Game "constructor"
export function newGame(): GameState {
  return {
    joinCode: randomJoinCode(), //code used by the joiner to join
    //number of wins of creator & joiner played using this join code,
    //excluding the current one.
    matchScore: [0, 0],
    socketIds: [null, null], //socked ids of creator & joiner
    idTokens: ["", ""],
    playerNames: [null, null],
    playerTokens: ["default", "default"],
    timeControl: null,
    boardSettings: null,

    arePlayersPresent: [false, false],
    creatorStarts: Math.random() < 0.5, //coin flip
    //array with the sequence of moves played on the board (if a takeback
    //happens, the move is removed from this history as well). Each entry in
    //moveHistory is an object with attributes:
    //actions (an array with the 1 or 2 actions for that move)
    //remainingTime (the time left of the player who made this move)
    //time stamp of when the move was received
    //distances: the distance of each player
    moveHistory: [],
    //'' if game is ongoing, else 'creator', 'joiner', or 'draw' (same as client)
    winner: "",
    //'' if game is ongoing, 'goal' or 'agreement' if drawn,
    //'time', 'goal', 'resign', or 'disconnect' if someone won
    finishReason: "",
    creationDate: null,
    startDate: null,
    isPublic: false,
    numSpectators: 0,
    version: "1.0",
    finalDists: [-1, -1], //-1,-1 until a move is registered
    numMoves: 0,
    ratings: [0, 0],
  };
}

//===========================================
//pure functions
//===========================================

export function turnCount(game: GameState): number {
  return game.moveHistory.length;
}

export function playerToMoveHasTimeLeft(game: GameState): boolean {
  const tLeft = game.moveHistory[game.moveHistory.length - 2].remainingTime;
  const lastOfMoveTime =
    game.moveHistory[game.moveHistory.length - 1].timestamp;
  const elapsedMs = new Date().valueOf() - new Date(lastOfMoveTime).valueOf();
  return tLeft * 1000 - elapsedMs >= 0;
}

export function clientIndex(game: GameState, idToken: string): 0 | 1 | null {
  if (game.idTokens[0] === idToken) return 0;
  if (game.idTokens[1] === idToken) return 1;
  return null;
}

export function creatorToMove(game: GameState): boolean {
  if (game.creatorStarts) return turnCount(game) % 2 == 0;
  return turnCount(game) % 2 == 1;
}

export function timeLeftByPlayer(game: GameState): [number, number] {
  const tc = game.moveHistory.length;
  if (tc < 2)
    return [
      (game.timeControl ? game.timeControl.duration : 0) * 60,
      (game.timeControl ? game.timeControl.duration : 0) * 60,
    ];
  const tLeftPToMove = game.moveHistory[tc - 2].remainingTime;
  const tLeftOther = game.moveHistory[tc - 1].remainingTime;
  const lastOfMoveTime = game.moveHistory[tc - 1].timestamp;
  const elapsedMs = new Date().valueOf() - new Date(lastOfMoveTime).valueOf();
  let timeLeftNow = Math.floor((tLeftPToMove * 1000 - elapsedMs) / 1000);
  if (timeLeftNow < 0) timeLeftNow = 0;
  return creatorToMove(game)
    ? [timeLeftNow, tLeftOther]
    : [tLeftOther, timeLeftNow];
}

//===========================================
//functions that modify the game state
//===========================================

export function addCreator({
  game,
  socketId,
  name,
  token,
  timeControl,
  boardSettings,
  idToken,
  isPublic,
  rating,
}: {
  game: GameState;
  socketId: string;
  name: string;
  token: string;
  timeControl: TimeControl;
  boardSettings: BoardSettings;
  idToken: string;
  isPublic: boolean;
  rating: number;
}): void {
  game.socketIds[0] = socketId;
  game.playerNames[0] = name;
  game.playerTokens[0] = token;
  game.timeControl = timeControl;
  game.boardSettings = boardSettings;
  game.idTokens[0] = idToken;
  game.arePlayersPresent[0] = true;
  game.isPublic = isPublic;
  game.creationDate = new Date(Date.now());
  game.ratings[0] = rating;
}

export function addJoiner({
  game,
  socketId,
  name,
  token,
  idToken,
  rating,
}: {
  game: GameState;
  socketId: string;
  name: string;
  token: string;
  idToken: string;
  rating: number;
}): void {
  game.socketIds[1] = socketId;
  game.playerNames[1] = name;
  game.playerTokens[1] = token;
  game.idTokens[1] = idToken;
  game.arePlayersPresent[1] = true;
  game.ratings[1] = rating;
}
export function setupRematch(
  game: GameState,
  newRatings: [number, number]
): void {
  if (game.winner === "draw") {
    game.matchScore[0] += 0.5;
    game.matchScore[1] += 0.5;
  } else if (game.winner === "creator") {
    game.matchScore[0]++;
  } else if (game.winner === "joiner") {
    game.matchScore[1]++;
  }
  game.creatorStarts = !game.creatorStarts; //alternate who starts
  game.moveHistory = [];
  game.finalDists = [-1, -1];
  game.numMoves = 0;
  game.winner = "";
  game.finishReason = "";
  game.ratings = newRatings;
}

export function addMove({
  game,
  actions,
  remainingTime,
  distances,
}: {
  game: GameState;
  actions: string[];
  remainingTime: number;
  distances: [number, number];
}): void {
  if (game.moveHistory.length === 0) game.startDate = new Date(Date.now());
  game.moveHistory.push({
    actions: actions,
    remainingTime: remainingTime,
    timestamp: new Date().toJSON(),
    distances: distances,
  });
  game.numMoves = game.moveHistory.length;
  game.finalDists = distances;
}

export function applyTakeback(game: GameState, requesterIdToken: string): void {
  const requesterToMove =
    requesterIdToken === game.idTokens[creatorToMove(game) ? 0 : 1];
  const numMovesToUndo = requesterToMove ? 2 : 1;
  for (let k = 0; k < numMovesToUndo; k++) game.moveHistory.pop();
  game.numMoves = game.moveHistory.length;
  if (game.numMoves === 0) game.finalDists = [-1, -1];
  else game.finalDists = game.moveHistory[game.numMoves - 1].distances;
}

export function applyGiveExtraTime(
  game: GameState,
  receiverIdToken: string
): void {
  if (game.moveHistory.length <= 1) return;
  const receiverToMove =
    receiverIdToken === game.idTokens[creatorToMove(game) ? 0 : 1];
  const lastMoveIdx = game.moveHistory.length - (receiverToMove ? 2 : 1);
  game.moveHistory[lastMoveIdx].remainingTime += 60;
}

export function setResult(
  game: GameState,
  winner: GameState["winner"],
  reason: GameState["finishReason"]
): void {
  game.winner = winner;
  game.finishReason = reason;
}

function randomJoinCode(): string {
  return Math.random().toString(36).substring(2, 8);
}
