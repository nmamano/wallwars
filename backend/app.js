const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const gameController = require("./src/gameController");
const GameManager = require("./src/GameManager");
const ChallengeBroadcast = require("./src/ChallengeBroadcast");
const { logMessage } = require("./src/logUtils");
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
const io = socketIo(server, {
  origins: [process.env.CLIENT_URL, process.env.CLIENT_URL + ":*"],
});

const genRandomCookieId = () => {
  return "ELO_" + Math.random().toString(36).substring(2);
};

//global object containing all the games
const GM = new GameManager();

//for informing clients about new challenges
const ChallengeBC = new ChallengeBroadcast();

io.on(M.connectionMsg, (socket) => {
  let clientCookieId = null;

  ////////////////////////////////////
  //utility functions
  ////////////////////////////////////
  const logReceivedMessage = (msgTitle, msgParams) => {
    const game = GM.ongoingGameOfClient(clientCookieId);
    logMessage(clientCookieId, socket.id, game, false, msgTitle, msgParams);
  };

  const emitMessage = (msgTitle, msgParams) => {
    if (msgParams) socket.emit(msgTitle, msgParams);
    else socket.emit(msgTitle);
    const game = GM.ongoingGameOfClient(clientCookieId);
    logMessage(clientCookieId, socket.id, game, true, msgTitle, msgParams);
  };

  const emitMessageOpponent = (msgTitle, msgParams) => {
    const oppSocketId = GM.getOpponentSocketId(clientCookieId);
    const oppCookieId = GM.getOpponentCookieId(clientCookieId);
    if (!oppSocketId) {
      console.log(`error: couldn't send message ${msgTitle} to opponent`);
      return;
    }
    if (msgParams) io.to(oppSocketId).emit(msgTitle, msgParams);
    else io.to(oppSocketId).emit(msgTitle);
    const game = GM.ongoingGameOfClient(clientCookieId);
    logMessage(oppCookieId, oppSocketId, game, true, msgTitle, msgParams);
  };

  const emitGameNotFoundError = () => emitMessage(M.gameNotFoundErrorMsg);

  //communicate the the opponent that the client is not coming back
  //and store the game to the DB if it had started
  const dealWithLingeringGame = async (game) => {
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
      await gameController.storeGame(game);
    }
  };

  ////////////////////////////////////
  //new connection start-up
  ////////////////////////////////////
  logReceivedMessage(M.connectionMsg);
  ChallengeBC.addSubscriber(socket);

  ////////////////////////////////////
  //process incoming messages
  ////////////////////////////////////
  socket.on(
    M.createGameMsg,
    async ({ name, token, timeControl, boardSettings, cookieId, isPublic }) => {
      logReceivedMessage(M.createGameMsg, {
        name,
        token,
        timeControl,
        boardSettings,
        cookieId,
        isPublic,
      });
      if (cookieId && cookieId !== "undefined") {
        clientCookieId = cookieId;
        const ongoingGame = GM.getOngoingGameByCookieId(clientCookieId);
        if (ongoingGame) await dealWithLingeringGame(ongoingGame);
        GM.removeGamesByCookieId(clientCookieId); //ensure there's no other game for this client
      } else {
        clientCookieId = genRandomCookieId();
      }
      const game = newGame();
      addCreator(
        game,
        socket.id,
        name,
        token,
        timeControl,
        boardSettings,
        clientCookieId,
        isPublic
      );
      GM.addUnjoinedGame(game);
      emitMessage(M.gameCreatedMsg, {
        joinCode: game.joinCode,
        creatorStarts: game.creatorStarts,
        cookieId: clientCookieId,
      });
      if (isPublic) ChallengeBC.notifyNewChallenge(game);
    }
  );

  socket.on(M.joinGameMsg, async ({ joinCode, name, token, cookieId }) => {
    logReceivedMessage(M.joinGameMsg, { joinCode, name, token, cookieId });
    if (cookieId) {
      const ongoingGame = GM.getOngoingGameByCookieId(cookieId);
      if (ongoingGame) await dealWithLingeringGame(ongoingGame, cookieId);
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
      boardSettings: game.boardSettings,
      creatorStarts: game.creatorStarts,
      cookieId: cookieId,
      creatorPresent: game.arePlayersPresent[0],
    });
    emitMessageOpponent(M.joinerJoinedMsg, {
      joinerName: name,
      joinerToken: token,
    });
    if (game.isPublic) {
      ChallengeBC.notifyDeadChallenge(game.joinCode);
    }
  });

  socket.on(M.moveMsg, ({ actions, remainingTime, distances }) => {
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
    addMove(game, actions, remainingTime, distances);
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

  socket.on(M.resignMsg, async () => {
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
    await gameController.storeGame(game);
  });

  socket.on(M.offerDrawMsg, () => {
    logReceivedMessage(M.offerDrawMsg);
    if (!GM.hasOngoingGame(clientCookieId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawOfferedMsg);
  });

  socket.on(M.acceptDrawMsg, async () => {
    logReceivedMessage(M.acceptDrawMsg);
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, "draw", "agreement");
    emitMessageOpponent(M.drawAcceptedMsg);
    await gameController.storeGame(game);
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

  socket.on(M.playerWonOnTimeMsg, async ({ winner }) => {
    logReceivedMessage(M.playerWonOnTimeMsg, { winner });
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, winner, "time");
    await gameController.storeGame(game);
  });

  socket.on(M.playerReachedGoalMsg, async ({ winner }) => {
    logReceivedMessage(M.playerReachedGoalMsg, { winner });
    const game = GM.ongoingGameOfClient(clientCookieId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, winner, "goal");
    await gameController.storeGame(game);
  });

  const handleClientLeaving = () => {
    if (!clientCookieId) return;
    const unjoinedGame = GM.getUnjoinedGameBySocketId(socket.id);
    if (unjoinedGame) ChallengeBC.notifyDeadChallenge(unjoinedGame.joinCode);
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
    ChallengeBC.removeSubscriber(socket.id);
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
  socket.on(M.requestCurrentChallengesMsg, () => {
    logReceivedMessage(M.requestCurrentChallengesMsg);
    const challenges = GM.getOpenChallenges();
    emitMessage(M.requestedCurrentChallengesMsg, {
      challenges: challenges,
    });
  });

  socket.on(M.getRankingMsg, async ({ count }) => {
    logReceivedMessage(M.getRankingMsg, { count });
    const ranking = await gameController.getRanking(count);
    if (ranking)
      emitMessage(M.requestedRankingMsg, {
        ranking: ranking,
      });
    else emitMessage(M.rankingNotFoundMsg);
  });

  socket.on(M.getRecentGamesMsg, async ({ count }) => {
    logReceivedMessage(M.getRecentGamesMsg, { count });
    const games = await gameController.getRecentGames(count);
    if (games)
      emitMessage(M.requestedRecentGamesMsg, {
        games: games,
      });
    else emitMessage(M.recentGamesNotFoundMsg);
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
