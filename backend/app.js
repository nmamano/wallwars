const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const gameController = require("./gameController");

const port = process.env.PORT || 4001;
const app = express();
//the server doesn't serve any HTML, but it needs a route to listen for incoming connections
const index = require("./routes/index");
app.use(index);
const server = http.createServer(app);
const io = socketIo(server);

class Game {
  //for extra reliability, we could add a check that there isn't
  //another unjoined game with the same id already
  static randomJoinCode() {
    return Math.random().toString(36).substring(2, 8);
  }

  constructor() {
    this.joinCode = Game.randomJoinCode(); //code used by the joiner to join
    //number of wins of creator & joiner played using this join code,
    //excluding the current one.
    this.gameWins = [0, 0];
    this.socketIds = [null, null]; //socked ids of creator & joiner
    this.playerNames = [null, null];
    this.playerTokens = ["default", "default"];
    //object with 2 attributes: duration (in minutes) and increment (in seconds)
    this.timeControl = null;
    this.creatorStarts = Math.random() < 0.5; //coin flip
    //array with the sequence of moves played on the board (if a takeback
    //happens, the move is removed from this history as well). Each entry in
    //moveHistory is an object with 2 attributes:
    //actions (an array with the 1 or 2 actions for that move)
    //remainingTime (the time left of the player who made this move)
    this.moveHistory = [];
    //'' if game is ongoing, else 'creator', 'joiner', or 'draw' (same as client)
    this.winner = "";
    //'' if game is ongoing, 'goal' or agreement' if drawn,
    //'time', 'goal', 'resign', or 'disconnect' if someone won
    this.finishReason = "";
    this.startDate = null;
  }
  addCreator(creatorSocketId, name, token, timeControl) {
    this.socketIds[0] = creatorSocketId;
    this.playerNames[0] = name;
    this.playerTokens[0] = token;
    this.timeControl = timeControl;
  }
  addJoiner(joinerSocketId, name, token) {
    this.socketIds[1] = joinerSocketId;
    this.playerNames[1] = name;
    this.playerTokens[1] = token;
  }
  setupRematch() {
    if (this.winner === "draw") {
      this.gameWins[0] += 0.5;
      this.gameWins[1] += 0.5;
    } else if (this.winner === "creator") {
      this.gameWins[0] += 1;
    } else if (this.winner === "joiner") {
      this.gameWins[1] += 1;
    }
    this.creatorStarts = !this.creatorStarts; //alternate who starts
    this.moveHistory = [];
    this.winner = "";
    this.finishReason = "";
  }
  addMove(actions, remainingTime) {
    if (this.moveHistory.length === 0) this.startDate = Date.now();
    this.moveHistory.push({ actions: actions, remainingTime: remainingTime });
  }
  applyTakeback(requesterSocketId) {
    const tc = this.moveHistory.length;
    const creatorToMove = tc % 2 === (this.creatorStarts ? 0 : 1);
    const requesterToMove =
      requesterSocketId === this.socketIds[creatorToMove ? 0 : 1];
    const numMovesToUndo = requesterToMove ? 2 : 1;
    for (let k = 0; k < numMovesToUndo; k++) this.moveHistory.pop();
  }
  setGameResult(winner, reason) {
    this.winner = winner;
    this.finishReason = reason;
  }
  turnCount() {
    return this.moveHistory.length;
  }
}
class GameManager {
  constructor() {
    //if there were many concurrent users, this should be converted into a map
    //to avoid linear search. Not needed for now
    this.unjoinedGames = [];
    //games stay in ongoingGames until a rematch starts or one of the players leaves
    //the game page, so they are not removed immediately when the game ends
    this.ongoingGames = [];
  }

  unjoinedGame(joinCode) {
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.joinCode === joinCode) return game;
    }
    return null;
  }

  ongoingGameOfClient(socketId) {
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      const [socketId1, socketId2] = game.socketIds;
      if (socketId === socketId1 || socketId === socketId2) return game;
    }
    return null;
  }

  getOpponentSocketId(socketId) {
    const game = this.ongoingGameOfClient(socketId);
    if (!game) return null;
    const [socketId1, socketId2] = game.socketIds;
    return socketId === socketId1 ? socketId2 : socketId1;
  }

  hasOngoingGame(socketId) {
    return this.ongoingGameOfClient(socketId) !== null;
  }

  addUnjoinedGame(game) {
    this.unjoinedGames.push(game);
  }

  moveGameFromUnjoinedToOngoing(joinCode) {
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.joinCode === joinCode) {
        this.unjoinedGames.splice(i, 1);
        this.ongoingGames.push(game);
        return;
      }
    }
    console.log(
      `error: couldn't move game with join code ${joinCode} from unjoined to ongoing`
    );
  }

  removeGamesOfClient(socketId) {
    this.removeUnjoinedGamesOfClient(socketId);
    this.removeOngoingGamesOfClient(socketId);
  }

  //in theory, clients can only have one unjoined game at a time,
  //but we check all to be sure
  removeUnjoinedGamesOfClient(socketId) {
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.socketIds[0] === socketId) {
        console.log("remove unjoined game: ", JSON.stringify(game));
        this.unjoinedGames.splice(i, 1);
        i -= 1;
      }
    }
  }

  //in theory, clients can only have one ongoing game at a time,
  //but we check all to be sure
  removeOngoingGamesOfClient(socketId) {
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      if (game.socketIds[0] === socketId || game.socketIds[1] === socketId) {
        this.ongoingGames.splice(i, 1);
        console.log("removed ongoing game: ", JSON.stringify(game));
        i -= 1;
      }
    }
  }

  printAllGames() {
    console.log("Unjoined games:", this.unjoinedGames);
    console.log("Ongoing games:", this.ongoingGames);
  }
}

//global object containing all the games
const GM = new GameManager();

//reserved socket.io events
const connectionMsg = "connection";
const disconnectMsg = "disconnect";
//gameplay messages
const createGameMsg = "createGame";
const gameCreatedMsg = "gameCreated";
const joinGameMsg = "joinGame";
const gameJoinedMsg = "gameJoined";
const gameJoinFailedMsg = "gameJoinFailed";
const joinerJoinedMsg = "joinerJoined";
const moveMessage = "move";
const movedMessage = "moved";
const gameNotFoundErrorMsg = "gameNotFoundError";
const resignMsg = "resign";
const resignedMsg = "resigned";
const leaveGameMsg = "leaveGame";
const leftGameMsg = "leftGame";
const playerWonOnTimeMsg = "playerWonOnTime";
const playerReachedGoalMsg = "playerReachedGoal";
const giveExtraTimeMsg = "giveExtraTime";
const extraTimeReceivedMsg = "extraTimeReceived";
const offerRematchMsg = "offerRematch";
const rematchOfferedMsg = "rematchOffered";
const rejectRematchMsg = "rejectRematch";
const rematchRejectedMsg = "rematchRejected";
const acceptRematchMsg = "acceptRematch";
const rematchAcceptedMsg = "rematchAccepted";
const offerDrawMsg = "offerDraw";
const drawOfferedMsg = "drawOffered";
const acceptDrawMsg = "acceptDraw";
const drawAcceptedMsg = "drawAccepted";
const rejectDrawMsg = "rejectDraw";
const drawRejectedMsg = "drawRejected";
const requestTakebackMsg = "requestTakeback";
const takebackRequestedMsg = "takebackRequested";
const acceptTakebackMsg = "acceptTakeback";
const takebackAcceptedMsg = "takebackAccepted";
const rejectTakebackMsg = "rejectTakeback";
const takebackRejectedMsg = "takebackRejected";
const pingServerMsg = "pingServer";
const pongFromServerMsg = "pongFromServer";
//GET messages
const getGameMsg = "getGame";
const requestedGameMsg = "requestedGame";
const getRandomGameMsg = "getRandomGame";
const requestedRandomGameMsg = "requestedRandomGame";
const randomGameNotFoundErrorMsg = "randomGameNotFound";
const getRecentGamesMsg = "getRecentGames";
const requestedRecentGamesMsg = "requestedRecentGames";

//middleware for logging incoming and outgoing messages
const logMessage = (socketId, sent, messageTitle, messageParams) => {
  const shortSocketId = socketId.substring(0, 3);
  let client = shortSocketId;
  const game = GM.ongoingGameOfClient(socketId);
  const date = new Date();
  let logText = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} `;
  if (game) {
    const shortJoinCode = game.joinCode.substring(0, 2);
    logText += `[${shortJoinCode}] `;
    const isCreator = socketId === game.socketIds[0];
    client += `(${isCreator ? "C" : "J"})`;
  }
  logText += sent ? "server => " + client : client + " => server";
  logText += `: ${messageTitle}`;

  if (messageParams) {
    const paramsText = JSON.stringify(messageParams);
    if (paramsText.length < 500) {
      logText += " " + paramsText;
    } else {
      const shortParamText = paramsText.substring(0, 500) + "...";
      logText += " " + shortParamText;
    }
  }
  console.log(logText);
};

io.on(connectionMsg, (socket) => {
  const socketId = socket.id;

  ////////////////////////////////////
  //low level utility functions
  ////////////////////////////////////
  const logReceivedMessage = (messageTitle, messageParams) =>
    logMessage(socketId, false, messageTitle, messageParams);

  const emitMessage = (messageTitle, params) => {
    if (params) socket.emit(messageTitle, params);
    else socket.emit(messageTitle);
    logMessage(socketId, true, messageTitle, params);
  };
  const emitMessageOpponent = (messageTitle, params) => {
    const oppId = GM.getOpponentSocketId(socketId);
    if (!oppId) {
      console.log(`error: couldn't send message ${messageTitle} to opponent`);
      return;
    }
    if (params) io.to(oppId).emit(messageTitle, params);
    else io.to(oppId).emit(messageTitle);
    logMessage(oppId, true, messageTitle, params);
  };
  const emitGameNotFoundError = () => emitMessage(gameNotFoundErrorMsg);

  logReceivedMessage(connectionMsg);

  ////////////////////////////////////
  //process incoming messages
  ////////////////////////////////////
  socket.on(createGameMsg, ({ name, token, timeControl }) => {
    GM.removeGamesOfClient(socketId); //ensure there's no other game for this client
    logReceivedMessage(createGameMsg, { name, token, timeControl });
    const game = new Game();
    game.addCreator(socketId, name, token, timeControl);
    GM.addUnjoinedGame(game);
    emitMessage(gameCreatedMsg, {
      joinCode: game.joinCode,
      creatorStarts: game.creatorStarts,
    });
  });

  socket.on(joinGameMsg, ({ joinCode, name, token }) => {
    GM.removeGamesOfClient(socketId); //ensure there's no other game for this client
    logReceivedMessage(joinGameMsg, { joinCode, name, token });
    const game = GM.unjoinedGame(joinCode);
    if (!game) {
      emitMessage(gameJoinFailedMsg);
      return;
    }
    game.addJoiner(socketId, name, token);
    GM.moveGameFromUnjoinedToOngoing(joinCode);
    emitMessage(gameJoinedMsg, {
      creatorName: game.playerNames[0],
      creatorToken: game.playerTokens[0],
      timeControl: game.timeControl,
      creatorStarts: game.creatorStarts,
    });
    emitMessageOpponent(joinerJoinedMsg, {
      joinerName: name,
      joinerToken: token,
    });
    // GM.printAllGames();
  });

  socket.on(moveMessage, ({ actions, remainingTime }) => {
    logReceivedMessage(moveMessage, { actions, remainingTime });
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") {
      console.log("error: received move for finished game");
      return;
    }
    game.addMove(actions, remainingTime);
    emitMessageOpponent(movedMessage, {
      actions: actions,
      moveIndex: game.turnCount(),
      remainingTime: remainingTime,
    });
  });

  socket.on(offerRematchMsg, () => {
    logReceivedMessage(offerRematchMsg);
    if (!GM.hasOngoingGame(socketId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(rematchOfferedMsg);
  });

  socket.on(rejectRematchMsg, () => {
    logReceivedMessage(rejectRematchMsg);
    if (!GM.hasOngoingGame(socketId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(rematchRejectedMsg);
  });

  socket.on(acceptRematchMsg, () => {
    logReceivedMessage(acceptRematchMsg);
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    game.setupRematch();
    emitMessageOpponent(rematchAcceptedMsg);
  });

  socket.on(resignMsg, () => {
    logReceivedMessage(resignMsg);
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    const winner = socketId === game.socketIds[0] ? "joiner" : "creator";
    game.setGameResult(winner, "resign");
    emitMessageOpponent(resignedMsg);
    gameController.storeGame(game);
  });

  socket.on(offerDrawMsg, () => {
    logReceivedMessage(offerDrawMsg);
    if (!GM.hasOngoingGame(socketId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(drawOfferedMsg);
  });

  socket.on(acceptDrawMsg, () => {
    logReceivedMessage(acceptDrawMsg);
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    game.setGameResult("draw", "agreement");
    emitMessageOpponent(drawAcceptedMsg);
    gameController.storeGame(game);
  });

  socket.on(rejectDrawMsg, () => {
    logReceivedMessage(rejectDrawMsg);
    if (!GM.hasOngoingGame(socketId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(drawRejectedMsg);
  });

  socket.on(requestTakebackMsg, () => {
    logReceivedMessage(requestTakebackMsg);
    if (!GM.hasOngoingGame(socketId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(takebackRequestedMsg);
  });

  socket.on(acceptTakebackMsg, () => {
    logReceivedMessage(acceptTakebackMsg);
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    game.applyTakeback(GM.getOpponentSocketId(socketId));
    emitMessageOpponent(takebackAcceptedMsg);
  });

  socket.on(rejectTakebackMsg, () => {
    logReceivedMessage(rejectTakebackMsg);
    if (!GM.hasOngoingGame(socketId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(takebackRejectedMsg);
  });

  socket.on(giveExtraTimeMsg, () => {
    logReceivedMessage(giveExtraTimeMsg);
    if (!GM.hasOngoingGame(socketId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(extraTimeReceivedMsg);
  });

  socket.on(playerWonOnTimeMsg, ({ winner }) => {
    logReceivedMessage(playerWonOnTimeMsg, { winner });
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    game.setGameResult(winner, "time");
    gameController.storeGame(game);
  });

  socket.on(playerReachedGoalMsg, ({ winner }) => {
    logReceivedMessage(playerReachedGoalMsg, { winner });
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    game.setGameResult(winner, "goal");
    gameController.storeGame(game);
  });

  socket.on(leaveGameMsg, () => {
    logReceivedMessage(leaveGameMsg);
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) return;
    emitMessageOpponent(leftGameMsg);
    if (game.winner === "") {
      const winner = socketId === game.socketIds[0] ? "joiner" : "creator";
      game.setGameResult(winner, "disconnect");
      gameController.storeGame(game);
    }
    GM.removeGamesOfClient(socketId);
  });

  //does the same as leaveMessage
  socket.on(disconnectMsg, () => {
    logReceivedMessage(disconnectMsg);
    const game = GM.ongoingGameOfClient(socketId);
    if (!game) return;
    emitMessageOpponent(leftGameMsg);
    if (game.winner === "") {
      const winner = socketId === game.socketIds[0] ? "joiner" : "creator";
      game.setGameResult(winner, "disconnect");
      gameController.storeGame(game);
    }
    GM.removeGamesOfClient(socketId);
  });

  socket.on(getGameMsg, async ({ gameId }) => {
    logReceivedMessage(getGameMsg, gameId);
    //in the future, this should also handle live games
    const game = await gameController.getGame(gameId);
    if (game) emitMessage(requestedGameMsg, { game: game });
    else emitMessage(gameNotFoundErrorMsg);
  });

  socket.on(getRandomGameMsg, async () => {
    logReceivedMessage(getRandomGameMsg);
    const game = await gameController.getRandomGame();
    if (game)
      emitMessage(requestedRandomGameMsg, {
        game: game,
      });
    else emitMessage(randomGameNotFoundErrorMsg);
  });

  socket.on(getRecentGamesMsg, async () => {
    logReceivedMessage(getRecentGamesMsg);
    const games = await gameController.getRecentGames();
    if (games)
      emitMessage(requestedRecentGamesMsg, {
        games: games,
      });
    else emitMessage(randomGameNotFoundErrorMsg);
  });

  socket.on(pingServerMsg, () => {
    logReceivedMessage(pingServerMsg);
    emitMessage(pongFromServerMsg);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
