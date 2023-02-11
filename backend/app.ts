import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

import { initialRating } from "./src/rating";
import * as db from "./src/database";
import { GameManager } from "./src/GameManager";
import index from "./index";
import ChallengeBroadcast from "./src/ChallengeBroadcast";
import { logMessage } from "./src/logUtils";
import {
  GameState,
  TimeControl,
  BoardSettings,
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
} from "./src/gameState";
import M from "./src/messageList";

////////////////////////////////////
// Boilerplate server setup
////////////////////////////////////
const port = process.env.PORT || 4001;
const app = express();
//the server doesn't serve any HTML, but it needs a route to listen for incoming connections
app.use(index);
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

//global object containing all the games
const GM = new GameManager();

//for informing clients about new challenges
const ChallengeBC = new ChallengeBroadcast();

io.on(M.connectionMsg, function (socket: any): void {
  let clientEloId: string | null = null;

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
    async function ({
      name,
      token,
      timeControl,
      boardSettings,
      eloId,
      isPublic,
    }: {
      name: string;
      token: string;
      timeControl: TimeControl;
      boardSettings: BoardSettings;
      eloId: string;
      isPublic: boolean;
    }): Promise<void> {
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
      const creatorPseudoPlayer = await db.getPseudoPlayer(clientEloId);
      const creatorRating = creatorPseudoPlayer
        ? creatorPseudoPlayer.rating
        : initialRating().rating;
      const game = newGame();
      addCreator({
        game,
        socketId: socket.id,
        name,
        token,
        timeControl,
        boardSettings,
        eloId: clientEloId,
        isPublic,
        rating: creatorRating,
      });
      GM.addUnjoinedGame(game);
      emitMessage(M.gameCreatedMsg, {
        joinCode: game.joinCode,
        creatorStarts: game.creatorStarts,
        rating: creatorRating,
      });
      if (isPublic) ChallengeBC.notifyNewChallenge(game);
    }
  );

  socket.on(
    M.joinGameMsg,
    async function ({
      joinCode,
      name,
      token,
      eloId,
    }: {
      joinCode: string;
      name: string;
      token: string;
      eloId: string;
    }): Promise<void> {
      logReceivedMessage(M.joinGameMsg, { joinCode, name, token, eloId });
      if (!isValidEloId(eloId)) {
        emitMessage(M.invalidEloIdErrorMsg);
        return;
      }
      const ongoingGame = GM.getOngoingGameByEloId(eloId);
      if (ongoingGame) await dealWithLingeringGame(ongoingGame);
      const game = GM.unjoinedGame(joinCode);
      if (!game || !game.eloIds[0]) {
        emitMessage(M.gameJoinFailedMsg);
        return;
      }
      if (game.eloIds[0] === eloId) {
        emitMessage(M.joinSelfGameFailedMsg);
        return;
      }
      GM.removeGamesByEloId(eloId); //ensure there's no other game for this client
      clientEloId = eloId;
      const joinerPseudoPlayer = await db.getPseudoPlayer(clientEloId);
      const joinerRating = joinerPseudoPlayer
        ? joinerPseudoPlayer.rating
        : initialRating().rating;
      const creatorPseudoPlayer = await db.getPseudoPlayer(game.eloIds[0]);
      const creatorRating = creatorPseudoPlayer
        ? creatorPseudoPlayer.rating
        : initialRating().rating;
      addJoiner({
        game,
        socketId: socket.id,
        name,
        token,
        eloId,
        rating: joinerRating,
      });
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
    }
  );

  socket.on(
    M.moveMsg,
    function ({
      actions,
      remainingTime,
      distances,
    }: {
      actions: string[];
      remainingTime: number;
      distances: [number, number];
    }): void {
      if (!clientEloId) {
        console.log("error: received move without clientEloId");
        return;
      }
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
      addMove({ game, actions, remainingTime, distances });
      emitMessageOpponent(M.movedMsg, {
        actions: actions,
        moveIndex: turnCount(game),
        remainingTime: remainingTime,
      });
    }
  );

  socket.on(M.offerRematchMsg, function (): void {
    logReceivedMessage(M.offerRematchMsg);
    if (!clientEloId) {
      console.log("error: received rematch offer without clientEloId");
      return;
    }
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchOfferedMsg);
  });

  socket.on(M.rejectRematchMsg, function (): void {
    logReceivedMessage(M.rejectRematchMsg);
    if (!clientEloId) {
      console.log("error: received reject rematch without clientEloId");
      return;
    }
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchRejectedMsg);
  });

  socket.on(M.acceptRematchMsg, async function (): Promise<void> {
    logReceivedMessage(M.acceptRematchMsg);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    const [creatorPseudoPlayer, joinerPseudoPlayer] =
      await getPseudoPlayersFromDB(game);
    if (!creatorPseudoPlayer || !joinerPseudoPlayer) {
      return;
    }
    const newRatings: [number, number] = [
      creatorPseudoPlayer.rating,
      joinerPseudoPlayer.rating,
    ];
    setupRematch(game, newRatings);
    emitMessageOpponent(M.rematchAcceptedMsg);
  });

  socket.on(M.resignMsg, async function (): Promise<void> {
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

  socket.on(M.offerDrawMsg, function (): void {
    logReceivedMessage(M.offerDrawMsg);
    if (!clientEloId) {
      console.log("error: received draw offer without clientEloId");
      return;
    }
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawOfferedMsg);
  });

  socket.on(M.acceptDrawMsg, async function (): Promise<void> {
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

  socket.on(M.rejectDrawMsg, function (): void {
    logReceivedMessage(M.rejectDrawMsg);
    if (!clientEloId) {
      console.log("error: received reject draw message without clientEloId");
      return;
    }
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawRejectedMsg);
  });

  socket.on(M.requestTakebackMsg, function (): void {
    logReceivedMessage(M.requestTakebackMsg);
    if (!clientEloId) {
      console.log("error: received takeback request without clientEloId");
      return;
    }
    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRequestedMsg);
  });

  socket.on(M.acceptTakebackMsg, function (): void {
    logReceivedMessage(M.acceptTakebackMsg);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    const oppEloId = GM.getOpponentEloId(clientEloId);
    if (!oppEloId) {
      console.log("error: opponent eloId not found");
      return;
    }
    applyTakeback(game, oppEloId);
    emitMessageOpponent(M.takebackAcceptedMsg);
  });

  socket.on(M.rejectTakebackMsg, function (): void {
    logReceivedMessage(M.rejectTakebackMsg);
    if (!clientEloId) {
      console.log(
        "error: received takeback rejected message without clientEloId"
      );
      return;
    }

    if (!GM.hasOngoingGame(clientEloId)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRejectedMsg);
  });

  socket.on(M.giveExtraTimeMsg, function (): void {
    logReceivedMessage(M.giveExtraTimeMsg);
    if (!clientEloId) {
      console.log("error: extra time without clientEloId");
      return;
    }

    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) {
      emitGameNotFoundError();
      return;
    }

    const oppEloId = GM.getOpponentEloId(clientEloId);
    if (!oppEloId) {
      console.log("error: opponent eloId not found");
      return;
    }
    applyGiveExtraTime(game, oppEloId);
    emitMessageOpponent(M.extraTimeReceivedMsg);
  });

  socket.on(
    M.playerWonOnTimeMsg,
    async function ({
      winner,
    }: {
      winner: "creator" | "joiner";
    }): Promise<void> {
      logReceivedMessage(M.playerWonOnTimeMsg, { winner });
      const game = GM.ongoingGameOfClient(clientEloId);
      if (!game) {
        emitGameNotFoundError();
        return;
      }
      if (game.winner !== "") return;
      setResult(game, winner, "time");
      await storeGameAndNotifyRatings(game);
    }
  );

  socket.on(
    M.playerReachedGoalMsg,
    async function ({
      winner,
    }: {
      winner: "creator" | "joiner" | "draw";
    }): Promise<void> {
      logReceivedMessage(M.playerReachedGoalMsg, { winner });
      const game = GM.ongoingGameOfClient(clientEloId);
      if (!game) {
        emitGameNotFoundError();
        return;
      }
      if (game.winner !== "") return;
      setResult(game, winner, "goal");
      await storeGameAndNotifyRatings(game);
    }
  );

  function handleClientLeaving(): void {
    if (!clientEloId) return;
    const unjoinedGame = GM.getUnjoinedGamesBySocketId(socket.id);
    if (unjoinedGame) ChallengeBC.notifyDeadChallenge(unjoinedGame.joinCode);
    GM.removeUnjoinedGamesByEloId(clientEloId);
    const game = GM.ongoingGameOfClient(clientEloId);
    if (!game) return;
    const idx = clientIndex(game, clientEloId);
    if (idx === null) return;
    game.arePlayersPresent[idx] = false;
    emitMessageOpponent(M.leftGameMsg);
    if (game.winner !== "") GM.removeOngoingGamesByEloId(clientEloId);
  }

  socket.on(M.leaveGameMsg, function (): void {
    logReceivedMessage(M.leaveGameMsg);
    handleClientLeaving();
  });

  socket.on(M.disconnectMsg, function (): void {
    logReceivedMessage(M.disconnectMsg);
    ChallengeBC.removeSubscriber(socket.id);
    handleClientLeaving();
  });

  socket.on(M.pingServerMsg, function (): void {
    logReceivedMessage(M.pingServerMsg);
    emitMessage(M.pongFromServerMsg);
  });

  socket.on(
    M.getGameMsg,
    async function ({ gameId }: { gameId: string }): Promise<void> {
      logReceivedMessage(M.getGameMsg, { gameId });
      // In the future, this should also handle live games
      const game = await db.getGame(gameId);
      if (game) emitMessage(M.requestedGameMsg, { game: game });
      else emitMessage(M.gameNotFoundErrorMsg);
    }
  );

  socket.on(M.getRandomGameMsg, async function (): Promise<void> {
    logReceivedMessage(M.getRandomGameMsg);
    const game = await db.getRandomGame();
    if (game)
      emitMessage(M.requestedRandomGameMsg, {
        game: game,
      });
    else emitMessage(M.randomGameNotFoundMsg);
  });

  socket.on(M.requestCurrentChallengesMsg, function (): void {
    logReceivedMessage(M.requestCurrentChallengesMsg);
    const challenges = GM.getOpenChallenges();
    emitMessage(M.requestedCurrentChallengesMsg, {
      challenges: challenges,
    });
  });

  socket.on(
    M.getRankingMsg,
    async function ({ count }: { count: number }): Promise<void> {
      logReceivedMessage(M.getRankingMsg, { count });
      const ranking = await db.getRanking(count);
      if (ranking) {
        emitMessage(M.requestedRankingMsg, {
          ranking: ranking,
        });
      } else emitMessage(M.rankingNotFoundMsg);
    }
  );

  socket.on(
    M.getSolvedPuzzlesMsg,
    async function ({ eloId }: { eloId: string }): Promise<void> {
      logReceivedMessage(M.getSolvedPuzzlesMsg, { eloId });
      const pseudoPlayer = await db.getPseudoPlayer(eloId);
      if (pseudoPlayer) {
        emitMessage(M.requestedSolvedPuzzlesMsg, {
          solvedPuzzles: pseudoPlayer.solvedPuzzles,
        });
      } else emitMessage(M.solvedPuzzlesNotFoundMsg);
    }
  );

  socket.on(
    M.solvedPuzzleMsg,
    async function ({
      eloId,
      name,
      puzzleId,
    }: {
      eloId: string;
      name: string;
      puzzleId: string;
    }): Promise<void> {
      logReceivedMessage(M.solvedPuzzleMsg, { eloId, name, puzzleId });
      await db.addPseudoPlayerSolvedPuzzle(eloId, name, puzzleId);
    }
  );

  socket.on(
    M.getRecentGameSummariesMsg,
    async function ({ count }: { count: number }): Promise<void> {
      logReceivedMessage(M.getRecentGameSummariesMsg, { count });
      const recentGameSummaries = await db.getRecentGameSummaries(count);
      if (recentGameSummaries)
        emitMessage(M.requestedRecentGameSummariesMsg, {
          recentGameSummaries: recentGameSummaries,
        });
      else emitMessage(M.recentGameSummariesNotFoundMsg);
    }
  );

  socket.on(
    M.checkHasOngoingGameMsg,
    function ({ eloId }: { eloId: string }): void {
      logReceivedMessage(M.checkHasOngoingGameMsg, { eloId });
      if (!isValidEloId(eloId)) {
        emitMessage(M.respondHasOngoingGameMsg, { res: false });
        return;
      }
      const game = GM.getOngoingGameByEloId(eloId);
      emitMessage(M.respondHasOngoingGameMsg, { res: game !== null });
    }
  );

  socket.on(
    M.returnToOngoingGameMsg,
    function ({ eloId }: { eloId: string }): void {
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
      if (idx === null) {
        console.log("Client index not found");
        return;
      }
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
    }
  );

  ////////////////////////////////////
  //utility functions
  ////////////////////////////////////

  function isValidEloId(eloId: string | null | undefined): boolean {
    return (
      eloId !== null &&
      eloId !== undefined &&
      eloId !== "" &&
      eloId !== "undefined" &&
      eloId.length >= 4 &&
      eloId !== "elo_"
    );
  }

  function logReceivedMessage(msgTitle: string, msgParams?: any): void {
    const game = GM.ongoingGameOfClient(clientEloId);
    logMessage({
      eloId: clientEloId,
      socketId: socket.id,
      game,
      sent: false,
      messageTitle: msgTitle,
      messageParams: msgParams,
    });
  }

  function emitMessage(msgTitle: string, msgParams?: any): void {
    if (msgParams) socket.emit(msgTitle, msgParams);
    else socket.emit(msgTitle);
    const game = GM.ongoingGameOfClient(clientEloId);
    logMessage({
      eloId: clientEloId,
      socketId: socket.id,
      game,
      sent: true,
      messageTitle: msgTitle,
      messageParams: msgParams,
    });
  }

  function emitMessageOpponent(msgTitle: string, msgParams?: any): void {
    const oppSocketId = GM.getOpponentSocketId(clientEloId);
    const oppEloId = GM.getOpponentEloId(clientEloId);
    if (!oppSocketId) {
      console.log(`error: couldn't send message ${msgTitle} to opponent`);
      return;
    }
    if (msgParams) io.to(oppSocketId).emit(msgTitle, msgParams);
    else io.to(oppSocketId).emit(msgTitle);
    const game = GM.ongoingGameOfClient(clientEloId);
    logMessage({
      eloId: oppEloId,
      socketId: oppSocketId,
      game,
      sent: true,
      messageTitle: msgTitle,
      messageParams: msgParams,
    });
  }

  function emitGameNotFoundError(): void {
    return emitMessage(M.gameNotFoundErrorMsg);
  }

  // assumes `game` has both eloIds and both players already exist in the DB
  async function getPseudoPlayersFromDB(
    game: GameState
  ): Promise<[db.dbPseudoPlayer | null, db.dbPseudoPlayer | null]> {
    if (!game.eloIds[0] || !game.eloIds[1]) return [null, null];

    const creator = await db.getPseudoPlayer(game.eloIds[0]);
    const joiner = await db.getPseudoPlayer(game.eloIds[1]);
    return [creator, joiner];
  }

  // stores game to db, updates pseudoplayers in db, messages both players about
  // new ratings
  async function storeGameAndNotifyRatings(game: GameState): Promise<void> {
    if (!clientEloId) return;

    const oldRatings = game.ratings;
    await db.storeGame(game);
    const [creatorPseudoPlayer, joinerPseudoPlayer] =
      await getPseudoPlayersFromDB(game);
    if (!creatorPseudoPlayer || !joinerPseudoPlayer) return;

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
  }

  //communicate the the opponent that the client is not coming back
  //and store the game to the DB if it had started
  async function dealWithLingeringGame(game: GameState): Promise<void> {
    if (!clientEloId) return;

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
  }
});

server.listen(port, () => console.log(`Listening on port ${port}`));
