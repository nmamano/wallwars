/* this file contains functions that modify the state of game
Note that the server's representation of a game is different than
the client's representation in several important aspects */

const randomJoinCode = () => {
  return Math.random().toString(36).substring(2, 8);
};

//Game "constructor"
exports.newGame = function () {
  return {
    joinCode: randomJoinCode(), //code used by the joiner to join
    //number of wins of creator & joiner played using this join code,
    //excluding the current one.
    matchScore: [0, 0],
    socketIds: [null, null], //socked ids of creator & joiner
    eloIds: [null, null],
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
    //'' if game is ongoing, 'goal' or agreement' if drawn,
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
};

//===========================================
//pure functions
//===========================================
const turnCount = function (game) {
  return game.moveHistory.length;
};
exports.turnCount = turnCount;

exports.playerToMoveHasTimeLeft = function (game) {
  const tLeft = game.moveHistory[game.moveHistory.length - 2].remainingTime;
  const lastOfMoveTime =
    game.moveHistory[game.moveHistory.length - 1].timestamp;
  const elapsedMs = new Date() - new Date(lastOfMoveTime);
  return tLeft * 1000 - elapsedMs >= 0;
};

exports.clientIndex = function (game, eloId) {
  if (game.eloIds[0] === eloId) return 0;
  if (game.eloIds[1] === eloId) return 1;
  return null;
};

const creatorToMove = function (game) {
  if (game.creatorStarts) return turnCount(game) % 2 == 0;
  return turnCount(game) % 2 == 1;
};
exports.creatorToMove = creatorToMove;

exports.timeLeftByPlayer = function (game) {
  const tc = game.moveHistory.length;
  if (tc < 2)
    return [game.timeControl.duration * 60, game.timeControl.duration * 60];
  const tLeftPToMove = game.moveHistory[tc - 2].remainingTime;
  const tLeftOther = game.moveHistory[tc - 1].remainingTime;
  const lastOfMoveTime = game.moveHistory[tc - 1].timestamp;
  const elapsedMs = new Date() - new Date(lastOfMoveTime);
  let timeLeftNow = Math.floor((tLeftPToMove * 1000 - elapsedMs) / 1000);
  if (timeLeftNow < 0) timeLeftNow = 0;
  return creatorToMove(game)
    ? [timeLeftNow, tLeftOther]
    : [tLeftOther, timeLeftNow];
};

//===========================================
//functions that modify the game state
//===========================================
exports.addCreator = function (
  game,
  socketId,
  name,
  token,
  timeControl,
  boardSettings,
  eloId,
  isPublic,
  rating
) {
  game.socketIds[0] = socketId;
  game.playerNames[0] = name;
  game.playerTokens[0] = token;
  game.timeControl = timeControl;
  game.boardSettings = boardSettings;
  game.eloIds[0] = eloId;
  game.arePlayersPresent[0] = true;
  game.isPublic = isPublic;
  game.creationDate = Date.now();
  game.ratings[0] = rating;
};

exports.addJoiner = function (game, socketId, name, token, eloId, rating) {
  game.socketIds[1] = socketId;
  game.playerNames[1] = name;
  game.playerTokens[1] = token;
  game.eloIds[1] = eloId;
  game.arePlayersPresent[1] = true;
  game.ratings[1] = rating;
};

exports.setupRematch = function (game, newRatings) {
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
};

exports.addMove = function (game, actions, remainingTime, distances) {
  if (game.moveHistory.length === 0) game.startDate = Date.now();
  game.moveHistory.push({
    actions: actions,
    remainingTime: remainingTime,
    timestamp: new Date().toJSON(),
    distances: distances,
  });
  game.numMoves = game.moveHistory.length;
  game.finalDists = distances;
};

exports.applyTakeback = function (game, requesterEloId) {
  const requesterToMove =
    requesterEloId === game.eloIds[creatorToMove(game) ? 0 : 1];
  const numMovesToUndo = requesterToMove ? 2 : 1;
  for (let k = 0; k < numMovesToUndo; k++) game.moveHistory.pop();
  game.numMoves = game.moveHistory.length;
  if (game.numMoves === 0) game.finalDists = [-1, -1];
  else game.finalDists = game.moveHistory[game.numMoves - 1].distances;
};

exports.applyGiveExtraTime = function (game, receiverEloId) {
  if (game.moveHistory.length <= 1) return;
  const receiverToMove =
    receiverEloId === game.eloIds[creatorToMove(game) ? 0 : 1];
  const lastMoveIdx = game.moveHistory.length - (receiverToMove ? 2 : 1);
  game.moveHistory[lastMoveIdx].remainingTime += 60;
};

exports.setResult = function (game, winner, reason) {
  game.winner = winner;
  game.finishReason = reason;
};
