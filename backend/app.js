const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const { initialRating } = require("./src/rating/rating");
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
const index = require("./index");
app.use(index);
const server = http.createServer(app);
const io = socketIo(server, {
  origins: [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL + ":80",
    process.env.CLIENT_URL + ":3000",
    process.env.CLIENT_URL + ":4000",
    process.env.CLIENT_URL + ":4001",
  ],
  cors: [
    process.env.CLIENT_URL,
    process.env.CLIENT_URL + ":80",
    process.env.CLIENT_URL + ":3000",
    process.env.CLIENT_URL + ":4000",
    process.env.CLIENT_URL + ":4001",
  ],
});

//global object containing all the games
const GM = new GameManager();

//for informing clients about new challenges
const ChallengeBC = new ChallengeBroadcast();

io.on(M.connectionMsg, (socket) => {
  let clientEloId = null;

  ////////////////////////////////////
  //utility functions
  ////////////////////////////////////

  const isValidEloId = (eloId) =>
    eloId &&
    eloId !== "" &&
    eloId !== "undefined" &&
    eloId.length >= 4 &&
    eloId !== "elo_";

  const logReceivedMessage = (msgTitle, msgParams) => {
    const game = GM.ongoingGameOfClient(clientEloId);
    logMessage(clientEloId, socket.id, game, false, msgTitle, msgParams);
  };

  const emitMessage = (msgTitle, msgParams) => {
    if (msgParams) socket.emit(msgTitle, msgParams);
    else socket.emit(msgTitle);
    const game = GM.ongoingGameOfClient(clientEloId);
    logMessage(clientEloId, socket.id, game, true, msgTitle, msgParams);
  };

  const emitMessageOpponent = (msgTitle, msgParams) => {
    const oppSocketId = GM.getOpponentSocketId(clientEloId);
    const oppEloId = GM.getOpponentEloId(clientEloId);
    if (!oppSocketId) {
      console.log(`error: couldn't send message ${msgTitle} to opponent`);
      return;
    }
    if (msgParams) io.to(oppSocketId).emit(msgTitle, msgParams);
    else io.to(oppSocketId).emit(msgTitle);
    const game = GM.ongoingGameOfClient(clientEloId);
    logMessage(oppEloId, oppSocketId, game, true, msgTitle, msgParams);
  };

  const emitGameNotFoundError = () => emitMessage(M.gameNotFoundErrorMsg);

  // assumes `game` has both eloIds and both players already exist in the DB
  const getPseudoPlayersFromDB = async (game) => {
    const creator = await gameController.getPseudoPlayer(game.eloIds[0]);
    const joiner = await gameController.getPseudoPlayer(game.eloIds[1]);
    return [creator, joiner];
  };

  // stores game to db, updates pseudoplayers in db, messages both players about
  // new ratings
  const storeGameAndNotifyRatings = async (game) => {
    const oldRatings = game.ratings;
    await gameController.storeGame(game);
    const [creatorPseudoPlayer, joinerPseudoPlayer] =
      await getPseudoPlayersFromDB(game);
    const newRatings = [creatorPseudoPlayer.rating, joinerPseudoPlayer.rating];
    const clientIdx = clientIndex(game, clientEloId);
    const opponentIdx = clientIdx === 0 ? 1 : 0;
    emitMessage(M.newRatingsNotificationMsg, {
      clientIdx: clientIdx,
      oldRatings: oldRatings,
      newRatings: newRatings,
    });
    emitMessageOpponent(M.newRatingsNotificationMsg, {
      clientIdx: opponentIdx,
      oldRatings: oldRatings,
      newRatings: newRatings,
    });
  };

  //communicate the the opponent that the client is not coming back
  //and store the game to the DB if it had started
  const dealWithLingeringGame = async (game) => {
    const idx = clientIndex(game, clientEloId);
    if (game.winner === "" && game.arePlayersPresent[idx === 0 ? 1 : 0])
      emitMessageOpponent(M.abandonedGameMsg);

    if (game.winner === "" && game.moveHistory.length > 1) {
      if (playerToMoveHasTimeLeft(game)) {
        const winner = clientEloId === game.eloIds[0] ? "joiner" : "creator";
        setResult(game, winner, "abandon");
      } else {
        const winner = creatorToMove(game) ? "joiner" : "creator";
        setResult(game, winner, "time");
      }
      await storeGameAndNotifyRatings(game);
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
    async ({ name, token, timeControl, boardSettings, eloId, isPublic }) => {
      logReceivedMessage(M.createGameMsg, {
        name,
        token,
        timeControl,
        boardSettings,
        eloId,
        isPublic,
      });
      if (!isValidEloId(eloId)) {
        emitMessage(M.invalidEloIdErrorMsg);
        return;
      }
      clientEloId = eloId;
      const ongoingGame = GM.getOngoingGameByEloId(clientEloId);
      if (ongoingGame) await dealWithLingeringGame(ongoingGame);
      GM.removeGamesByEloId(clientEloId); //ensure there's no other game for this client
      const creatorPseudoPlayer = await gameController.getPseudoPlayer(
        clientEloId
      );
      const creatorRating = creatorPseudoPlayer
        ? creatorPseudoPlayer.rating
        : initialRating().rating;
      const game = newGame();
      addCreator(
        game,
        socket.id,
        name,
        token,
        timeControl,
        boardSettings,
        clientEloId,
        isPublic,
        creatorRating
      );
      GM.addUnjoinedGame(game);
      emitMessage(M.gameCreatedMsg, {
        joinCode: game.joinCode,
        creatorStarts: game.creatorStarts,
        rating: creatorRating,
      });
      if (isPublic) ChallengeBC.notifyNewChallenge(game);
    }
  );

  socket.on(M.joinGameMsg, async ({ joinCode, name, token, eloId }) => {
    logReceivedMessage(M.joinGameMsg, { joinCode, name, token, eloId });
    if (!isValidEloId(eloId)) {
      emitMessage(M.invalidEloIdErrorMsg);
      return;
    }
    const ongoingGame = GM.getOngoingGameByEloId(eloId);
    if (ongoingGame) await dealWithLingeringGame(ongoingGame, eloId);
    const game = GM.unjoinedGame(joinCode);
    if (!game) {
      emitMessage(M.gameJoinFailedMsg);
      return;
    }
    if (game.eloIds[0] === eloId) {
      emitMessage(M.joinSelfGameFailedMsg);
      return;
    }
    GM.removeGamesByEloId(eloId); //ensure there's no other game for this client
    clientEloId = eloId;
    const joinerPseudoPlayer = await gameController.getPseudoPlayer(
      clientEloId
    );
    const joinerRating = joinerPseudoPlayer
      ? joinerPseudoPlayer.rating
      : initialRating().rating;
    const creatorPseudoPlayer = await gameController.getPseudoPlayer(
      game.eloIds[0]
    );
    const creatorRating = creatorPseudoPlayer
      ? creatorPseudoPlayer.rating
      : initialRating().rating;
    addJoiner(game, socket.id, name, token, eloId, joinerRating);
    GM.moveGameFromUnjoinedToOngoing(joinCode);
    emitMessage(M.gameJoinedMsg, {
      creatorName: game.playerNames[0],
      creatorToken: game.playerTokens[0],
      timeControl: game.timeControl,
      boardSettings: game.boardSettings,
      creatorStarts: game.creatorStarts,
      creatorPresent: game.arePlayersPresent[0],
      creatorRating: creatorRating,
      joinerRating: joinerRating,
    });
    emitMessageOpponent(M.joinerJoinedMsg, {
      joinerName: name,
      joinerToken: token,
      joinerRating: joinerRating,
    });
    if (game.isPublic) {
      ChallengeBC.notifyDeadChallenge(game.joinCode);
    }
  });

  socket.on(M.moveMsg, ({ actions, remainingTime, distances }) => {
    logReceivedMessage(M.moveMsg, { actions, remainingTime });
    const game = GM.ongoingGameOfClient(clientEloId);
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
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchOfferedMsg);
  });

  socket.on(M.rejectRematchMsg, () => {
    logReceivedMessage(M.rejectRematchMsg);
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchRejectedMsg);
  });

  socket.on(M.acceptRematchMsg, async () => {
    logReceivedMessage(M.acceptRematchMsg);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    const [creatorPseudoPlayer, joinerPseudoPlayer] =
      await getPseudoPlayersFromDB(game);
    const newRatings = [creatorPseudoPlayer.rating, joinerPseudoPlayer.rating];
    setupRematch(game, newRatings);
    emitMessageOpponent(M.rematchAcceptedMsg);
  });

  socket.on(M.resignMsg, async () => {
    logReceivedMessage(M.resignMsg);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    const winner = clientEloId === game.eloIds[0] ? "joiner" : "creator";
    emitMessageOpponent(M.resignedMsg);
    setResult(game, winner, "resign");
    await storeGameAndNotifyRatings(game);
  });

  socket.on(M.offerDrawMsg, () => {
    logReceivedMessage(M.offerDrawMsg);
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawOfferedMsg);
  });

  socket.on(M.acceptDrawMsg, async () => {
    logReceivedMessage(M.acceptDrawMsg);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    emitMessageOpponent(M.drawAcceptedMsg);
    setResult(game, "draw", "agreement");
    await storeGameAndNotifyRatings(game);
  });

  socket.on(M.rejectDrawMsg, () => {
    logReceivedMessage(M.rejectDrawMsg);
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawRejectedMsg);
  });

  socket.on(M.requestTakebackMsg, () => {
    logReceivedMessage(M.requestTakebackMsg);
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRequestedMsg);
  });

  socket.on(M.acceptTakebackMsg, () => {
    logReceivedMessage(M.acceptTakebackMsg);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    applyTakeback(game, GM.getOpponentEloId(clientEloId));
    emitMessageOpponent(M.takebackAcceptedMsg);
  });

  socket.on(M.rejectTakebackMsg, () => {
    logReceivedMessage(M.rejectTakebackMsg);
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRejectedMsg);
  });

  socket.on(M.giveExtraTimeMsg, () => {
    logReceivedMessage(M.giveExtraTimeMsg);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    applyGiveExtraTime(game, GM.getOpponentEloId(clientEloId));
    emitMessageOpponent(M.extraTimeReceivedMsg);
  });

  socket.on(M.playerWonOnTimeMsg, async ({ winner }) => {
    logReceivedMessage(M.playerWonOnTimeMsg, { winner });
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, winner, "time");
    await storeGameAndNotifyRatings(game);
  });

  socket.on(M.playerReachedGoalMsg, async ({ winner }) => {
    logReceivedMessage(M.playerReachedGoalMsg, { winner });
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    setResult(game, winner, "goal");
    await storeGameAndNotifyRatings(game);
  });

  const handleClientLeaving = () => {
    if (!clientEloId) return;
    const unjoinedGame = GM.getUnjoinedGameBySocketId(socket.id);
    if (unjoinedGame) ChallengeBC.notifyDeadChallenge(unjoinedGame.joinCode);
    GM.removeUnjoinedGamesByEloId(clientEloId);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) return;
    const idx = clientIndex(game, clientEloId);
    if (idx === null) return;
    game.arePlayersPresent[idx] = false;
    emitMessageOpponent(M.leftGameMsg);
    if (game.winner !== "") GM.removeOngoingGamesByEloId(clientEloId);
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
    if (ranking) {
      emitMessage(M.requestedRankingMsg, {
        ranking: ranking,
      });
    } else emitMessage(M.rankingNotFoundMsg);
  });

  socket.on(M.getSolvedPuzzlesMsg, async ({ eloId }) => {
    logReceivedMessage(M.getSolvedPuzzlesMsg, { eloId });
    const pseudoPlayer = await gameController.getPseudoPlayer(eloId);
    if (pseudoPlayer) {
      emitMessage(M.requestedSolvedPuzzlesMsg, {
        solvedPuzzles: pseudoPlayer.solvedPuzzles,
      });
    } else emitMessage(M.solvedPuzzlesNotFoundMsg);
  });

  socket.on(M.solvedPuzzleMsg, async ({ eloId, name, puzzleId }) => {
    logReceivedMessage(M.solvedPuzzleMsg, { eloId, name, puzzleId });
    await gameController.addPseudoPlayerSolvedPuzzle(eloId, name, puzzleId);
  });

  socket.on(M.getRecentGameSummariesMsg, async ({ count }) => {
    logReceivedMessage(M.getRecentGameSummariesMsg, { count });
    const recentGameSummaries = await gameController.getRecentGameSummaries(
      count
    );
    if (recentGameSummaries)
      emitMessage(M.requestedRecentGameSummariesMsg, {
        recentGameSummaries: recentGameSummaries,
      });
    else emitMessage(M.recentGameSummariesNotFoundMsg);
  });

  socket.on(M.checkHasOngoingGameMsg, ({ eloId }) => {
    logReceivedMessage(M.checkHasOngoingGameMsg, { eloId });
    if (!isValidEloId(eloId)) {
      emitMessage(M.respondHasOngoingGameMsg, { res: false });
      return;
    }
    const game = GM.getOngoingGameByEloId(eloId);
    emitMessage(M.respondHasOngoingGameMsg, { res: game !== null });
  });

  socket.on(M.returnToOngoingGameMsg, ({ eloId }) => {
    logReceivedMessage(M.returnToOngoingGameMsg, { eloId });
    if (!isValidEloId(eloId)) {
      emitMessage(M.ongoingGameNotFoundMsg);
      return;
    }
    clientEloId = eloId;
    const game = GM.getOngoingGameByEloId(clientEloId);
    if (!game) {
      emitMessage(M.ongoingGameNotFoundMsg);
      return;
    }
    const idx = clientIndex(game, clientEloId);
    game.arePlayersPresent[idx] = true;
    //when a client returns to a game, we need to update its socket id
    game.socketIds[idx] = socket.id;
    let gameWithoutEloIds = JSON.parse(JSON.stringify(game));
    delete gameWithoutEloIds.eloIds;
    emitMessage(M.returnedToOngoingGameMsg, {
      ongoingGame: gameWithoutEloIds,
      isCreator: idx === 0,
      timeLeft: timeLeftByPlayer(game),
    });
    emitMessageOpponent(M.opponentReturnedMsg);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
