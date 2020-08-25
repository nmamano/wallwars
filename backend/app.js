const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const gameController = require("./src/gameController");
const GameManager = require("./src/GameManager");
const {
  newGame,
  turnCount,
  playerToMoveHasTimeLeft,
  clientIndex,
  creatorToMove,
  timeLeftByPlayer,
  addCreator,
  addJoiner,
  setupRematch,
  addMove,
  applyTakeback,
  applyGiveExtraTime,
  setResult,
} = require("./src/gameState");
const M = require("./src/messageList");

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

//global object containing all the games
const GM = new GameManager();

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

io.on(M.connectionMsg, (socket) => {
  let clientCookieId = null;

  ////////////////////////////////////
  //utility functions
  ////////////////////////////////////
  const logReceivedMessage = (messageTitle, messageParams) =>
    logMessage(clientCookieId, socket.id, false, messageTitle, messageParams);

  logReceivedMessage(M.connectionMsg);

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

  const emitGameNotFoundError = () => emitMessage(M.gameNotFoundErrorMsg);

  //communicate the the opponent that the client is not coming back
  //and store the game to the DB if it had started
  const dealWithLingeringGame = (game) => {
    const idx = clientIndex(game, clientCookieId);
    if (game.winner === "" && game.arePlayersPresent[idx === 0 ? 1 : 0])
      emitMessageOpponent(M.abandonedGameMsg);

    if (game.winner === "" && game.moveHistory.length > 1) {
      if (playerToMoveHasTimeLeft(game)) {
        const winner =
          clientCookieId === game.cookieIds[0] ? "joiner" : "creator";
        setResult(game, winner, "abandon");
      } else {
        const winner = creatorToMove(game) ? "joiner" : "creator";
        setResult(game, winner, "time");
      }
      gameController.storeGame(game);
    }
  };

  ////////////////////////////////////
  //process incoming messages
  ////////////////////////////////////

  socket.on(M.createGameMsg, ({ name, token, timeControl, cookieId }) => {
    logReceivedMessage(M.createGameMsg, { name, token, timeControl, cookieId });
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
    emitMessage(M.gameCreatedMsg, {
      joinCode: game.joinCode,
      creatorStarts: game.creatorStarts,
      cookieId: clientCookieId,
    });
  });

  socket.on(M.joinGameMsg, ({ joinCode, name, token, cookieId }) => {
    logReceivedMessage(M.joinGameMsg, { joinCode, name, token, cookieId });
    if (cookieId) {
      const ongoingGame = GM.getOngoingGameByCookieId(cookieId);
      if (ongoingGame) dealWithLingeringGame(ongoingGame, cookieId);
    }
    const game = GM.unjoinedGame(joinCode);
    if (!game) {
      emitMessage(M.gameJoinFailedMsg);
      return;
    }
    if (game.cookieIds[0] === cookieId) {
      emitMessage(M.joinSelfGameFailedMsg);
      return;
    }
    GM.removeGamesByCookieId(cookieId); //ensure there's no other game for this client
    if (!cookieId || cookieId === "undefined") cookieId = genRandomCookieId();
    clientCookieId = cookieId;
    addJoiner(game, socket.id, name, token, cookieId);
    GM.moveGameFromUnjoinedToOngoing(joinCode);
    emitMessage(M.gameJoinedMsg, {
      creatorName: game.playerNames[0],
      creatorToken: game.playerTokens[0],
      timeControl: game.timeControl,
      creatorStarts: game.creatorStarts,
      cookieId: cookieId,
      creatorPresent: game.arePlayersPresent[0],
    });
    emitMessageOpponent(M.joinerJoinedMsg, {
      joinerName: name,
      joinerToken: token,
    });
    // GM.printAllGames();
  });

  socket.on(M.moveMsg, ({ actions, remainingTime }) => {
    logReceivedMessage(M.moveMsg, { actions, remainingTime });
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
    emitMessageOpponent(M.movedMsg, {
      actions: actions,
      moveIndex: turnCount(game),
      remainingTime: remainingTime,
    });
  });

  socket.on(M.offerRematchMsg, () => {
    logReceivedMessage(M.offerRematchMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchOfferedMsg);
  });

  socket.on(M.rejectRematchMsg, () => {
    logReceivedMessage(M.rejectRematchMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchRejectedMsg);
  });

  socket.on(M.acceptRematchMsg, () => {
    logReceivedMessage(M.acceptRematchMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    setupRematch(game);
    emitMessageOpponent(M.rematchAcceptedMsg);
  });

  socket.on(M.resignMsg, () => {
    logReceivedMessage(M.resignMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    const winner = clientCookieId === game.cookieIds[0] ? "joiner" : "creator";
    setResult(game, winner, "resign");
    emitMessageOpponent(M.resignedMsg);
    gameController.storeGame(game);
  });

  socket.on(M.offerDrawMsg, () => {
    logReceivedMessage(M.offerDrawMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawOfferedMsg);
  });

  socket.on(M.acceptDrawMsg, () => {
    logReceivedMessage(M.acceptDrawMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, "draw", "agreement");
    emitMessageOpponent(M.drawAcceptedMsg);
    gameController.storeGame(game);
  });

  socket.on(M.rejectDrawMsg, () => {
    logReceivedMessage(M.rejectDrawMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawRejectedMsg);
  });

  socket.on(M.requestTakebackMsg, () => {
    logReceivedMessage(M.requestTakebackMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRequestedMsg);
  });

  socket.on(M.acceptTakebackMsg, () => {
    logReceivedMessage(M.acceptTakebackMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    applyTakeback(game, GM.getOpponentCookieId(clientCookieId));
    emitMessageOpponent(M.takebackAcceptedMsg);
  });

  socket.on(M.rejectTakebackMsg, () => {
    logReceivedMessage(M.rejectTakebackMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRejectedMsg);
  });

  socket.on(M.giveExtraTimeMsg, () => {
    logReceivedMessage(M.giveExtraTimeMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    applyGiveExtraTime(game, GM.getOpponentCookieId(clientCookieId));
    emitMessageOpponent(M.extraTimeReceivedMsg);
  });

  socket.on(M.playerWonOnTimeMsg, ({ winner }) => {
    logReceivedMessage(M.playerWonOnTimeMsg, { winner });
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, winner, "time");
    gameController.storeGame(game);
  });

  socket.on(M.playerReachedGoalMsg, ({ winner }) => {
    logReceivedMessage(M.playerReachedGoalMsg, { winner });
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
    emitMessageOpponent(M.leftGameMsg);
    if (game.winner !== "") GM.removeOngoingGamesByCookieId(clientCookieId);
  };

  socket.on(M.leaveGameMsg, () => {
    logReceivedMessage(M.leaveGameMsg);
    handleClientLeaving();
  });

  socket.on(M.disconnectMsg, () => {
    logReceivedMessage(M.disconnectMsg);
    handleClientLeaving();
  });

  socket.on(M.pingServerMsg, () => {
    logReceivedMessage(M.pingServerMsg);
    emitMessage(M.pongFromServerMsg);
  });

  socket.on(M.getGameMsg, async ({ gameId }) => {
    logReceivedMessage(M.getGameMsg, { gameId });
    //in the future, this should also handle live games
    const game = await gameController.getGame(gameId);
    if (game) emitMessage(M.requestedGameMsg, { game: game });
    else emitMessage(M.gameNotFoundErrorMsg);
  });

  socket.on(M.getRandomGameMsg, async () => {
    logReceivedMessage(M.getRandomGameMsg);
    const game = await gameController.getRandomGame();
    if (game)
      emitMessage(M.requestedRandomGameMsg, {
        game: game,
      });
    else emitMessage(M.randomGameNotFoundMsg);
  });

  socket.on(M.getRecentGamesMsg, async () => {
    logReceivedMessage(M.getRecentGamesMsg);
    const games = await gameController.getRecentGames();
    if (games)
      emitMessage(M.requestedRecentGamesMsg, {
        games: games,
      });
    else emitMessage(M.randomGameNotFoundMsg);
  });

  socket.on(M.checkHasOngoingGameMsg, ({ cookieId }) => {
    logReceivedMessage(M.checkHasOngoingGameMsg, { cookieId });
    if (!cookieId || cookieId === "undefined") {
      emitMessage(M.respondHasOngoingGameMsg, { res: false });
      return;
    }
    const game = GM.getOngoingGameByCookieId(cookieId);
    emitMessage(M.respondHasOngoingGameMsg, { res: game !== null });
  });

  socket.on(M.returnToOngoingGameMsg, ({ cookieId }) => {
    logReceivedMessage(M.returnToOngoingGameMsg, { cookieId });
    if (!cookieId || cookieId === "undefined") {
      emitMessage(M.ongoingGameNotFoundMsg);
      return;
    }
    clientCookieId = cookieId;
    const game = GM.getOngoingGameByCookieId(clientCookieId);
    if (!game) {
      emitMessage(M.ongoingGameNotFoundMsg);
      return;
    }
    const idx = clientIndex(game, clientCookieId);
    game.arePlayersPresent[idx] = true;
    //when a client returns to a game, we need to update its socket id
    game.socketIds[idx] = socket.id;
    emitMessage(M.returnedToOngoingGameMsg, {
      ongoingGame: game,
      timeLeft: timeLeftByPlayer(game),
    });
    emitMessageOpponent(M.opponentReturnedMsg);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
