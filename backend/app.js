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

const genRandomCookieId = () => {
  return Math.random().toString(36).substring(2);
};
//for extra reliability, we could add a check that there isn't
//another unjoined game with the same id already
const randomJoinCode = () => {
  return Math.random().toString(36).substring(2, 8);
};

const newGame = () => {
  return {
    joinCode: randomJoinCode(), //code used by the joiner to join
    //number of wins of creator & joiner played using this join code,
    //excluding the current one.
    gameWins: [0, 0],
    socketIds: [null, null], //socked ids of creator & joiner
    //a cookie is stored at each client which can be used to rejoin a game
    cookieIds: [null, null],
    playerNames: [null, null],
    playerTokens: ["default", "default"],
    //object with 2 attributes: duration (in minutes) and increment (in seconds)
    timeControl: null,

    arePlayersPresent: [false, false],
    creatorStarts: Math.random() < 0.5, //coin flip
    //array with the sequence of moves played on the board (if a takeback
    //happens, the move is removed from this history as well). Each entry in
    //moveHistory is an object with 3 attributes:
    //actions (an array with the 1 or 2 actions for that move)
    //remainingTime (the time left of the player who made this move)
    //time stamp of when the move was received
    moveHistory: [],
    //'' if game is ongoing, else 'creator', 'joiner', or 'draw' (same as client)
    winner: "",
    //'' if game is ongoing, 'goal' or agreement' if drawn,
    //'time', 'goal', 'resign', or 'disconnect' if someone won
    finishReason: "",
    startDate: null,
  };
};
//===========================================
//functions that modify the game state
//===========================================
const addCreator = (game, socketId, name, token, timeControl, cookieId) => {
  game.socketIds[0] = socketId;
  game.playerNames[0] = name;
  game.playerTokens[0] = token;
  game.timeControl = timeControl;
  game.cookieIds[0] = cookieId;
  game.arePlayersPresent[0] = true;
};
const addJoiner = (game, socketId, name, token, cookieId) => {
  game.socketIds[1] = socketId;
  game.playerNames[1] = name;
  game.playerTokens[1] = token;
  game.cookieIds[1] = cookieId;
  game.arePlayersPresent[1] = true;
};
const setupRematch = (game) => {
  if (game.winner === "draw") {
    game.gameWins[0] += 0.5;
    game.gameWins[1] += 0.5;
  } else if (game.winner === "creator") {
    game.gameWins[0] += 1;
  } else if (game.winner === "joiner") {
    game.gameWins[1] += 1;
  }
  game.creatorStarts = !game.creatorStarts; //alternate who starts
  game.moveHistory = [];
  game.winner = "";
  game.finishReason = "";
};
const addMove = (game, actions, remainingTime) => {
  if (game.moveHistory.length === 0) game.startDate = Date.now();
  game.moveHistory.push({
    actions: actions,
    remainingTime: remainingTime,
    timestamp: new Date().toJSON(),
  });
};
const applyTakeback = (game, requesterCookieId) => {
  const requesterToMove =
    requesterCookieId === game.cookieIds[creatorToMove(game) ? 0 : 1];
  const numMovesToUndo = requesterToMove ? 2 : 1;
  for (let k = 0; k < numMovesToUndo; k++) game.moveHistory.pop();
};
const applyGiveExtraTime = (game, receiverCookieId) => {
  if (game.moveHistory.length <= 1) return;
  const receiverToMove =
    receiverCookieId === game.cookieIds[creatorToMove(game) ? 0 : 1];
  const lastMoveIdx = game.moveHistory.length - (receiverToMove ? 2 : 1);
  game.moveHistory[lastMoveIdx].remainingTime += 60;
};

const setResult = (game, winner, reason) => {
  game.winner = winner;
  game.finishReason = reason;
};
const turnCount = (game) => {
  return game.moveHistory.length;
};
const playerToMoveHasTimeLeft = (game) => {
  const tLeft = game.moveHistory[game.moveHistory.length - 2].remainingTime;
  const lastOfMoveTime =
    game.moveHistory[game.moveHistory.length - 1].timestamp;
  const elapsedMs = new Date() - new Date(lastOfMoveTime);
  return tLeft * 1000 - elapsedMs >= 0;
};

clientIndex = (game, cookieId) => {
  if (game.cookieIds[0] === cookieId) return 0;
  if (game.cookieIds[1] === cookieId) return 1;
  return null;
};

creatorToMove = (game) => {
  if (game.creatorStarts) return turnCount(game) % 2 == 0;
  return turnCount(game) % 2 == 1;
};

const timeLeftByPlayer = (game) => {
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

class GameManager {
  constructor() {
    //if there were many concurrent users, this should be converted into a map
    //to avoid linear search. Not needed for now
    this.unjoinedGames = [];
    //games are removed from ongoingGames when a players leaves the game page
    //AND the game is over. Or when one of the players creates/joins a new game
    this.ongoingGames = [];
  }

  unjoinedGame(joinCode) {
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.joinCode === joinCode) return game;
    }
    return null;
  }

  ongoingGameOfClient(cookieId) {
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      const [id1, id2] = game.cookieIds;
      if (cookieId === id1 || cookieId === id2) return game;
    }
    return null;
  }

  getOngoingGameByCookieId(cookieId) {
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      const [id1, id2] = game.cookieIds;
      if (cookieId === id1 || cookieId === id2) return game;
    }
    return null;
  }

  getOpponentSocketId(cookieId) {
    const game = this.ongoingGameOfClient(cookieId);
    if (!game) return null;
    const [socketId1, socketId2] = game.socketIds;
    return cookieId === game.cookieIds[0] ? socketId2 : socketId1;
  }
  getOpponentCookieId(cookieId) {
    const game = this.ongoingGameOfClient(cookieId);
    if (!game) return null;
    const [cookieId1, cookieId2] = game.cookieIds;
    return cookieId === cookieId1 ? cookieId2 : cookieId1;
  }

  hasOngoingGame(cookieId) {
    return this.ongoingGameOfClient(cookieId) !== null;
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

  removeGamesByCookieId(cookieId) {
    this.removeUnjoinedGamesByCookieId(cookieId);
    this.removeOngoingGamesByCookieId(cookieId);
  }

  //in theory, clients can only have one unjoined game at a time,
  //but we check all to be sure
  removeUnjoinedGamesByCookieId(cookieId) {
    if (!cookieId) return;
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.cookieIds[0] === cookieId) {
        console.log("remove unjoined game: ", JSON.stringify(game));
        this.unjoinedGames.splice(i, 1);
        i -= 1;
      }
    }
  }

  //in theory, clients can only have one ongoing game at a time,
  //but we check all to be sure
  removeOngoingGamesByCookieId(cookieId) {
    if (!cookieId) return;
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      if (game.cookieIds[0] === cookieId || game.cookieIds[1] === cookieId) {
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
const moveMsg = "move";
const movedMsg = "moved";
const gameNotFoundErrorMsg = "gameNotFoundError";
const resignMsg = "resign";
const resignedMsg = "resigned";
const leaveGameMsg = "leaveGame";
const leftGameMsg = "leftGame";
const abandonedGameMsg = "abandonedGame";
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
const returnToOngoingGameMsg = "returnToOngoingGame";
const returnedToOngoingGameMsg = "returnedToOngoingGame";
const opponentReturnedMsg = "opponentReturned";
const checkHasOngoingGameMsg = "checkHasOngoingGame";
const respondHasOngoingGameMsg = "respondHasOngoingGame";
const ongoingGameNotFoundMsg = "ongoingGameNotFound";
const getRandomGameMsg = "getRandomGame";
const requestedRandomGameMsg = "requestedRandomGame";
const randomGameNotFoundMsg = "randomGameNotFound";
const getRecentGamesMsg = "getRecentGames";
const requestedRecentGamesMsg = "requestedRecentGames";

//middleware for logging incoming and outgoing messages
//format: hh:mm:ss ss|ccc|J -> SERVER: m [gg] {p}
//ss: first 2 chars of the socket id,
//ccc: first 3 chars of the cookie id, or '___' if unknown
//J: client role. 'C' for creator, 'J' for joiner, or '_' if not in a game
//X -> Y: X is the sender and Y the receiver. One of them is SERVER
//m: message title
//gg: first 2 chars of the join code ([gg] is missing if the client is not in a game)
//p: key-value pairs of the message parameters. May be cut short if too long
const logMessage = (cookieId, socketId, sent, messageTitle, messageParams) => {
  const maxLogMsgLength = 141;
  const shortCookieId = cookieId ? cookieId.substring(0, 3) : "___";
  const shortSocketId = socketId.substring(0, 2);
  let client = shortSocketId + "|" + shortCookieId;
  const game = GM.ongoingGameOfClient(cookieId);
  const date = new Date();
  let logText = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} `;
  if (game) {
    const isCreator = cookieId === game.cookieIds[0];
    client += `|${isCreator ? "C" : "J"}`;
  } else {
    client += "|_";
  }
  logText += sent ? "SERVER -> " + client : client + " -> SERVER";
  logText += `: ${messageTitle}`;
  if (game) {
    const shortJoinCode = game.joinCode.substring(0, 2);
    logText += ` [${shortJoinCode}]`;
  }
  if (messageParams) {
    logText += " ";
    const paramsText = JSON.stringify(messageParams);
    if (logText.length + paramsText.length <= maxLogMsgLength) {
      logText += paramsText;
    } else {
      const shortParams = paramsText.substring(
        0,
        maxLogMsgLength - logText.length - 3
      );
      logText += shortParams + "...";
    }
  }
  console.log(logText);
};

io.on(connectionMsg, (socket) => {
  let clientCookieId = null;

  ////////////////////////////////////
  //utility functions
  ////////////////////////////////////
  const logReceivedMessage = (messageTitle, messageParams) =>
    logMessage(clientCookieId, socket.id, false, messageTitle, messageParams);

  const emitMessage = (messageTitle, params) => {
    if (params) socket.emit(messageTitle, params);
    else socket.emit(messageTitle);
    logMessage(clientCookieId, socket.id, true, messageTitle, params);
  };

  const emitMessageOpponent = (messageTitle, params) => {
    const oppSocketId = GM.getOpponentSocketId(clientCookieId);
    const oppCookieId = GM.getOpponentCookieId(clientCookieId);
    if (!oppSocketId) {
      console.log(`error: couldn't send message ${messageTitle} to opponent`);
      return;
    }
    if (params) io.to(oppSocketId).emit(messageTitle, params);
    else io.to(oppSocketId).emit(messageTitle);
    logMessage(oppCookieId, oppSocketId, true, messageTitle, params);
  };

  const emitGameNotFoundError = () => emitMessage(gameNotFoundErrorMsg);

  //communicate the the opponent that the client is not coming back
  //and store the game to the DB if it had started
  const dealWithLingeringGame = (game) => {
    const idx = clientIndex(game, clientCookieId);
    if (game.winner === "" && game.arePlayersPresent[idx === 0 ? 1 : 0])
      emitMessageOpponent(abandonedGameMsg);

    if (game.winner === "" && game.moveHistory.length > 1) {
      if (playerToMoveHasTimeLeft(game)) {
        const winner =
          clientCookieId === game.cookieIds[0] ? "joiner" : "creator";
        setResult(game, winner, "abandonment");
      } else {
        const winner = creatorToMove(game) ? "joiner" : "creator";
        setResult(game, winner, "time");
      }
      gameController.storeGame(game);
    }
  };

  logReceivedMessage(connectionMsg);

  ////////////////////////////////////
  //process incoming messages
  ////////////////////////////////////

  socket.on(createGameMsg, ({ name, token, timeControl, cookieId }) => {
    logReceivedMessage(createGameMsg, { name, token, timeControl, cookieId });
    if (cookieId && cookieId !== "undefined") {
      clientCookieId = cookieId;
      const ongoingGame = GM.getOngoingGameByCookieId(clientCookieId);
      if (ongoingGame) dealWithLingeringGame(ongoingGame);
      GM.removeGamesByCookieId(clientCookieId); //ensure there's no other game for this client
    } else {
      clientCookieId = genRandomCookieId();
    }
    const game = newGame();
    addCreator(game, socket.id, name, token, timeControl, clientCookieId);
    GM.addUnjoinedGame(game);
    emitMessage(gameCreatedMsg, {
      joinCode: game.joinCode,
      creatorStarts: game.creatorStarts,
      cookieId: clientCookieId,
    });
  });

  socket.on(joinGameMsg, ({ joinCode, name, token, cookieId }) => {
    logReceivedMessage(joinGameMsg, { joinCode, name, token, cookieId });
    if (cookieId) {
      const ongoingGame = GM.getOngoingGameByCookieId(cookieId);
      if (ongoingGame) dealWithLingeringGame(ongoingGame, cookieId);
    }
    GM.removeGamesByCookieId(cookieId); //ensure there's no other game for this client
    const game = GM.unjoinedGame(joinCode);
    if (!game) {
      emitMessage(gameJoinFailedMsg);
      return;
    }
    if (!cookieId || cookieId === "undefined") cookieId = genRandomCookieId();
    clientCookieId = cookieId;
    addJoiner(game, socket.id, name, token, cookieId);
    GM.moveGameFromUnjoinedToOngoing(joinCode);
    emitMessage(gameJoinedMsg, {
      creatorName: game.playerNames[0],
      creatorToken: game.playerTokens[0],
      timeControl: game.timeControl,
      creatorStarts: game.creatorStarts,
      cookieId: cookieId,
      creatorPresent: game.arePlayersPresent[0],
    });
    emitMessageOpponent(joinerJoinedMsg, {
      joinerName: name,
      joinerToken: token,
    });
    // GM.printAllGames();
  });

  socket.on(moveMsg, ({ actions, remainingTime }) => {
    logReceivedMessage(moveMsg, { actions, remainingTime });
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") {
      console.log("error: received move for finished game");
      return;
    }
    addMove(game, actions, remainingTime);
    emitMessageOpponent(movedMsg, {
      actions: actions,
      moveIndex: turnCount(game),
      remainingTime: remainingTime,
    });
  });

  socket.on(offerRematchMsg, () => {
    logReceivedMessage(offerRematchMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(rematchOfferedMsg);
  });

  socket.on(rejectRematchMsg, () => {
    logReceivedMessage(rejectRematchMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(rematchRejectedMsg);
  });

  socket.on(acceptRematchMsg, () => {
    logReceivedMessage(acceptRematchMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    setupRematch(game);
    emitMessageOpponent(rematchAcceptedMsg);
  });

  socket.on(resignMsg, () => {
    logReceivedMessage(resignMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    const winner = clientCookieId === game.cookieIds[0] ? "joiner" : "creator";
    setResult(game, winner, "resign");
    emitMessageOpponent(resignedMsg);
    gameController.storeGame(game);
  });

  socket.on(offerDrawMsg, () => {
    logReceivedMessage(offerDrawMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(drawOfferedMsg);
  });

  socket.on(acceptDrawMsg, () => {
    logReceivedMessage(acceptDrawMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, "draw", "agreement");
    emitMessageOpponent(drawAcceptedMsg);
    gameController.storeGame(game);
  });

  socket.on(rejectDrawMsg, () => {
    logReceivedMessage(rejectDrawMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(drawRejectedMsg);
  });

  socket.on(requestTakebackMsg, () => {
    logReceivedMessage(requestTakebackMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(takebackRequestedMsg);
  });

  socket.on(acceptTakebackMsg, () => {
    logReceivedMessage(acceptTakebackMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    applyTakeback(game, GM.getOpponentCookieId(clientCookieId));
    emitMessageOpponent(takebackAcceptedMsg);
  });

  socket.on(rejectTakebackMsg, () => {
    logReceivedMessage(rejectTakebackMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(takebackRejectedMsg);
  });

  socket.on(giveExtraTimeMsg, () => {
    logReceivedMessage(giveExtraTimeMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    applyGiveExtraTime(game, GM.getOpponentCookieId(clientCookieId));
    emitMessageOpponent(extraTimeReceivedMsg);
  });

  socket.on(playerWonOnTimeMsg, ({ winner }) => {
    logReceivedMessage(playerWonOnTimeMsg, { winner });
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, winner, "time");
    gameController.storeGame(game);
  });

  socket.on(playerReachedGoalMsg, ({ winner }) => {
    logReceivedMessage(playerReachedGoalMsg, { winner });
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, winner, "goal");
    gameController.storeGame(game);
  });

  const handleClientLeaving = () => {
    if (!clientCookieId) return;
    GM.removeUnjoinedGamesByCookieId(clientCookieId);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) return;
    const idx = clientIndex(game, clientCookieId);
    if (idx === null) return;
    game.arePlayersPresent[idx] = false;
    emitMessageOpponent(leftGameMsg);
    if (game.winner !== "") GM.removeOngoingGamesByCookieId(clientCookieId);
  };
  socket.on(leaveGameMsg, () => {
    logReceivedMessage(leaveGameMsg);
    handleClientLeaving();
  });

  socket.on(disconnectMsg, () => {
    logReceivedMessage(disconnectMsg);
    handleClientLeaving();
  });

  socket.on(pingServerMsg, () => {
    logReceivedMessage(pingServerMsg);
    emitMessage(pongFromServerMsg);
  });

  socket.on(getGameMsg, async ({ gameId }) => {
    logReceivedMessage(getGameMsg, { gameId });
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
    else emitMessage(randomGameNotFoundMsg);
  });

  socket.on(getRecentGamesMsg, async () => {
    logReceivedMessage(getRecentGamesMsg);
    const games = await gameController.getRecentGames();
    if (games)
      emitMessage(requestedRecentGamesMsg, {
        games: games,
      });
    else emitMessage(randomGameNotFoundMsg);
  });

  socket.on(checkHasOngoingGameMsg, ({ cookieId }) => {
    logReceivedMessage(checkHasOngoingGameMsg, { cookieId });
    if (!cookieId || cookieId === "undefined") {
      emitMessage(respondHasOngoingGameMsg, { res: false });
      return;
    }
    const game = GM.getOngoingGameByCookieId(cookieId);
    emitMessage(respondHasOngoingGameMsg, { res: game !== null });
  });
  socket.on(returnToOngoingGameMsg, ({ cookieId }) => {
    logReceivedMessage(returnToOngoingGameMsg, { cookieId });
    if (!cookieId || cookieId === "undefined") {
      emitMessage(ongoingGameNotFoundMsg);
      return;
    }
    clientCookieId = cookieId;
    const game = GM.getOngoingGameByCookieId(clientCookieId);
    if (!game) {
      emitMessage(ongoingGameNotFoundMsg);
      return;
    }

    const idx = clientIndex(game, clientCookieId);
    game.arePlayersPresent[idx] = true;
    //when a client returns to a game, we need to update its socket id
    game.socketIds[idx] = socket.id;

    emitMessage(returnedToOngoingGameMsg, {
      ongoingGame: game,
      timeLeft: timeLeftByPlayer(game),
    });
    emitMessageOpponent(opponentReturnedMsg);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
