import express from "express";
import http from "http";
import { Server } from "socket.io";

import { initialRating } from "./src/rating";
import * as db from "./src/database";
import { GameManager } from "./src/GameManager";
import index from "./index";
import ChallengeBroadcast from "./src/ChallengeBroadcast";
import { logMessage } from "./src/logUtils";
import cors from "cors";
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
import { version } from "wallwars-core";
import { randPlayerName } from "./src/authUtils";

console.log(`Using ${version()}`);

////////////////////////////////////
// Boilerplate server setup.
////////////////////////////////////
const port = process.env.PORT || 4001;
const app = express();
// The server doesn't serve any HTML, but it needs a route to listen for incoming connections.
app.use(cors);
app.use(index);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Global object containing all the games.
const GM = new GameManager();

// For informing clients about new challenges.
const ChallengeBC = new ChallengeBroadcast();

io.on(M.connectionMsg, function (socket: any): void {
  let clientIdToken: string = socket.id;

  ////////////////////////////////////
  // New connection start-up.
  ////////////////////////////////////
  logReceivedMessage(M.connectionMsg);
  ChallengeBC.addSubscriber(socket);

  ////////////////////////////////////
  // Process incoming messages.
  ////////////////////////////////////
  socket.on(
    M.createGameMsg,
    async function ({
      name,
      token,
      timeControl,
      boardSettings,
      idToken,
      isPublic,
    }: {
      name: string;
      token: string;
      timeControl: TimeControl;
      boardSettings: BoardSettings;
      idToken: string;
      isPublic: boolean;
    }): Promise<void> {
      logReceivedMessage(M.createGameMsg, {
        name,
        token,
        timeControl,
        boardSettings,
        idToken,
        isPublic,
      });
      if (!isValidIdToken(idToken)) {
        emitMessage(M.invalidIdTokenErrorMsg);
        return;
      }
      if (idToken) clientIdToken = idToken;

      const ongoingGame = GM.getOngoingGameByIdToken(clientIdToken);
      if (ongoingGame) await dealWithLingeringGame(ongoingGame);
      GM.removeGamesByIdToken(clientIdToken); // Ensure there's no other game for this client.
      const creatorPlayer = await db.getPlayer(clientIdToken);
      const creatorRating = creatorPlayer
        ? creatorPlayer.rating
        : initialRating().rating;
      const game = newGame();
      addCreator({
        game,
        socketId: socket.id,
        name,
        token,
        timeControl,
        boardSettings,
        idToken: clientIdToken,
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
      idToken,
    }: {
      joinCode: string;
      name: string;
      token: string;
      idToken: string;
    }): Promise<void> {
      logReceivedMessage(M.joinGameMsg, { joinCode, name, token, idToken });
      if (!isValidIdToken(idToken)) {
        emitMessage(M.invalidIdTokenErrorMsg);
        return;
      }
      const ongoingGame = GM.getOngoingGameByIdToken(idToken);
      if (ongoingGame) await dealWithLingeringGame(ongoingGame);
      const game = GM.unjoinedGame(joinCode);
      if (!game || !game.idTokens[0]) {
        emitMessage(M.gameJoinFailedMsg);
        return;
      }
      if (game.idTokens[0] === idToken) {
        emitMessage(M.joinSelfGameFailedMsg);
        return;
      }
      GM.removeGamesByIdToken(idToken); // Ensure there's no other game for this client.
      if (idToken) clientIdToken = idToken;
      const joinerPlayer = await db.getPlayer(clientIdToken);
      const joinerRating = joinerPlayer
        ? joinerPlayer.rating
        : initialRating().rating;
      const creatorPlayer = await db.getPlayer(game.idTokens[0]);
      const creatorRating = creatorPlayer
        ? creatorPlayer.rating
        : initialRating().rating;
      addJoiner({
        game,
        socketId: socket.id,
        name,
        token,
        idToken: clientIdToken,
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
        // removes game from list of open challenges when player joins
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
      if (!clientIdToken) {
        console.log("error: received move without clientIdToken");
        return;
      }
      logReceivedMessage(M.moveMsg, { actions, remainingTime });
      const game = GM.ongoingGameOfClient(clientIdToken);
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
    if (!clientIdToken) {
      console.log("error: received rematch offer without clientIdToken");
      return;
    }
    if (!GM.hasOngoingGame(clientIdToken)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchOfferedMsg);
  });

  socket.on(M.rejectRematchMsg, function (): void {
    logReceivedMessage(M.rejectRematchMsg);
    if (!clientIdToken) {
      console.log("error: received reject rematch without clientIdToken");
      return;
    }
    if (!GM.hasOngoingGame(clientIdToken)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchRejectedMsg);
  });

  socket.on(M.acceptRematchMsg, async function (): Promise<void> {
    logReceivedMessage(M.acceptRematchMsg);
    const game = GM.ongoingGameOfClient(clientIdToken);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    const [creatorPlayer, joinerPlayer] = await getPlayersFromDB(game);
    let newRatings: [number, number] = [0, 0];
    if (creatorPlayer) newRatings[0] = creatorPlayer.rating;
    if (joinerPlayer) newRatings[1] = joinerPlayer.rating;
    setupRematch(game, newRatings);

    emitMessageOpponent(M.rematchAcceptedMsg);
  });

  socket.on(M.resignMsg, async function (): Promise<void> {
    logReceivedMessage(M.resignMsg);
    const game = GM.ongoingGameOfClient(clientIdToken);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    if (game.winner !== "") return;
    const winner = clientIdToken === game.idTokens[0] ? "joiner" : "creator";
    emitMessageOpponent(M.resignedMsg);
    setResult(game, winner, "resign");
    await storeGameAndNotifyRatings(game);
  });

  socket.on(M.offerDrawMsg, function (): void {
    logReceivedMessage(M.offerDrawMsg);
    if (!clientIdToken) {
      console.log("error: received draw offer without clientIdToken");
      return;
    }
    if (!GM.hasOngoingGame(clientIdToken)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawOfferedMsg);
  });

  socket.on(M.acceptDrawMsg, async function (): Promise<void> {
    logReceivedMessage(M.acceptDrawMsg);
    const game = GM.ongoingGameOfClient(clientIdToken);
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
    if (!clientIdToken) {
      console.log("error: received reject draw message without clientIdToken");
      return;
    }
    if (!GM.hasOngoingGame(clientIdToken)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawRejectedMsg);
  });

  socket.on(M.requestTakebackMsg, function (): void {
    logReceivedMessage(M.requestTakebackMsg);
    if (!clientIdToken) {
      console.log("error: received takeback request without clientIdToken");
      return;
    }
    if (!GM.hasOngoingGame(clientIdToken)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRequestedMsg);
  });

  socket.on(M.acceptTakebackMsg, function (): void {
    logReceivedMessage(M.acceptTakebackMsg);
    const game = GM.ongoingGameOfClient(clientIdToken);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    const oppIdToken = GM.getOpponentIdToken(clientIdToken);
    if (!oppIdToken) {
      console.log("error: opponent idToken not found");
      return;
    }
    applyTakeback(game, oppIdToken);
    emitMessageOpponent(M.takebackAcceptedMsg);
  });

  socket.on(M.rejectTakebackMsg, function (): void {
    logReceivedMessage(M.rejectTakebackMsg);
    if (!clientIdToken) {
      console.log(
        "error: received takeback rejected message without clientIdToken"
      );
      return;
    }

    if (!GM.hasOngoingGame(clientIdToken)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRejectedMsg);
  });

  socket.on(M.giveExtraTimeMsg, function (): void {
    logReceivedMessage(M.giveExtraTimeMsg);
    if (!clientIdToken) {
      console.log("error: extra time without clientIdToken");
      return;
    }

    const game = GM.ongoingGameOfClient(clientIdToken);
    if (!game) {
      emitGameNotFoundError();
      return;
    }

    const oppIdToken = GM.getOpponentIdToken(clientIdToken);
    if (!oppIdToken) {
      console.log("error: opponent idToken not found");
      return;
    }
    applyGiveExtraTime(game, oppIdToken);
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
      const game = GM.ongoingGameOfClient(clientIdToken);
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
      const game = GM.ongoingGameOfClient(clientIdToken);
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
    if (!clientIdToken) return;
    const unjoinedGame = GM.getUnjoinedGamesBySocketId(socket.id);
    if (unjoinedGame) ChallengeBC.notifyDeadChallenge(unjoinedGame.joinCode);
    GM.removeUnjoinedGamesByIdToken(clientIdToken);
    const game = GM.ongoingGameOfClient(clientIdToken);
    if (!game) return;
    const idx = clientIndex(game, clientIdToken);
    if (idx === null) return;
    game.arePlayersPresent[idx] = false;
    emitMessageOpponent(M.leftGameMsg);
    if (game.winner !== "") GM.removeOngoingGamesByIdToken(clientIdToken);
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
    M.loggedInMsg,
    async function ({ idToken }: { idToken: string }): Promise<void> {
      logReceivedMessage(M.loggedInMsg, { idToken });
      const player = await db.getPlayer(idToken);
      if (player) {
        return; // Player already exists, does not need to be created.
      }

      // Get a random and unique name.
      let newName = randPlayerName();
      let tries = 20;
      while (tries > 0) {
        console.log("Trying name: " + newName);
        if (await db.nameExists(newName)) {
          newName = randPlayerName();
          tries--;
        } else break;
      }
      if (tries === 0) {
        console.error("Could not find a unique name for new player");
        emitMessage(M.createNewPlayerFailedMsg);
        return;
      }

      let success = await db.addNewPlayer(idToken, newName);
      if (!success) {
        emitMessage(M.createNewPlayerFailedMsg);
      } else {
        emitMessage(M.createdNewPlayerMsg, { name: newName });
      }
    }
  );

  socket.on(
    M.changeNameMsg,
    async function ({
      idToken,
      name,
    }: {
      idToken: string;
      name: string;
    }): Promise<void> {
      logReceivedMessage(M.changeNameMsg, { idToken, name });
      // Perform formatting validation.
      if (name.length > 15) {
        emitMessage(M.nameChangeFailedMsg, { reason: "Name too long" });
        return;
      }
      if (name.length < 3) {
        emitMessage(M.nameChangeFailedMsg, { reason: "Name too short" });
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        emitMessage(M.nameChangeFailedMsg, {
          reason: "Name contains invalid characters",
        });
        return;
      }
      if (name.toLowerCase() === "guest") {
        emitMessage(M.nameChangeFailedMsg, {
          reason: "Name cannot be 'guest'",
        });
        return;
      }
      if (idToken === "") {
        emitMessage(M.nameChangeFailedMsg, { reason: "Internal error" });
        return;
      }
      const nameExists = await db.nameExists(name);
      if (nameExists) {
        emitMessage(M.nameChangeFailedMsg, {
          reason: "Name already taken",
        });
        return;
      }
      const success = await db.changeName(idToken, name);
      if (!success) {
        emitMessage(M.nameChangeFailedMsg, { reason: "Internal error" });
      } else {
        // The input parameters are passed back in the response in case the
        // client sent multiple changeName messages, so we know which one the
        // server is responding to.
        emitMessage(M.nameChangedMsg, { idToken: idToken, name: name });
      }
    }
  );

  socket.on(
    M.getGameMsg,
    async function ({ gameId }: { gameId: string }): Promise<void> {
      logReceivedMessage(M.getGameMsg, { gameId });
      // In the future, this should also handle live games.
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
    async function ({ idToken }: { idToken: string }): Promise<void> {
      logReceivedMessage(M.getSolvedPuzzlesMsg, { idToken });
      const player = await db.getPlayer(idToken);
      if (player) {
        emitMessage(M.requestedSolvedPuzzlesMsg, {
          solvedPuzzles: player.solvedPuzzles,
        });
      } else emitMessage(M.solvedPuzzlesNotFoundMsg);
    }
  );

  socket.on(
    M.solvedPuzzleMsg,
    async function ({
      idToken,
      name,
      puzzleId,
    }: {
      idToken: string;
      name: string;
      puzzleId: string;
    }): Promise<void> {
      logReceivedMessage(M.solvedPuzzleMsg, { idToken, name, puzzleId });
      await db.addPlayerSolvedPuzzle(idToken, name, puzzleId);
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
    function ({ idToken }: { idToken: string }): void {
      logReceivedMessage(M.checkHasOngoingGameMsg, { idToken });
      if (!isValidIdToken(idToken)) {
        emitMessage(M.respondHasOngoingGameMsg, { res: false });
        return;
      }
      const game = GM.getOngoingGameByIdToken(idToken);
      emitMessage(M.respondHasOngoingGameMsg, { res: game !== null });
    }
  );

  socket.on(
    M.returnToOngoingGameMsg,
    function ({ idToken }: { idToken: string }): void {
      logReceivedMessage(M.returnToOngoingGameMsg, { idToken });
      if (!isValidIdToken(idToken)) {
        emitMessage(M.ongoingGameNotFoundMsg);
        return;
      }
      if (idToken) clientIdToken = idToken;
      const game = GM.getOngoingGameByIdToken(clientIdToken);
      if (!game) {
        emitMessage(M.ongoingGameNotFoundMsg);
        return;
      }
      const idx = clientIndex(game, clientIdToken);
      if (idx === null) {
        console.log("Client index not found");
        return;
      }
      game.arePlayersPresent[idx] = true;
      // When a client returns to a game, we need to update its socket id.
      game.socketIds[idx] = socket.id;
      let gameWithoutIdTokens = JSON.parse(JSON.stringify(game));
      delete gameWithoutIdTokens.idTokens;
      emitMessage(M.returnedToOngoingGameMsg, {
        ongoingGame: gameWithoutIdTokens,
        isCreator: idx === 0,
        timeLeft: timeLeftByPlayer(game),
      });
      emitMessageOpponent(M.opponentReturnedMsg);
    }
  );

  ////////////////////////////////////
  // Utility functions.
  ////////////////////////////////////

  function isValidIdToken(idToken: string | null | undefined): boolean {
    return idToken !== null && idToken !== undefined && idToken !== "undefined";
  }

  function logReceivedMessage(msgTitle: string, msgParams?: any): void {
    const game = GM.ongoingGameOfClient(clientIdToken);
    logMessage({
      idToken: clientIdToken,
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
    const game = GM.ongoingGameOfClient(clientIdToken);
    logMessage({
      idToken: clientIdToken,
      socketId: socket.id,
      game,
      sent: true,
      messageTitle: msgTitle,
      messageParams: msgParams,
    });
  }

  function emitMessageOpponent(msgTitle: string, msgParams?: any): void {
    const oppSocketId = GM.getOpponentSocketId(clientIdToken);
    const oppIdToken = GM.getOpponentIdToken(clientIdToken);
    if (!oppSocketId) {
      console.log(`error: couldn't send message ${msgTitle} to opponent`);
      return;
    }
    if (msgParams) io.to(oppSocketId).emit(msgTitle, msgParams);
    else io.to(oppSocketId).emit(msgTitle);
    const game = GM.ongoingGameOfClient(clientIdToken);
    logMessage({
      idToken: oppIdToken!,
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

  // Assumes `game` has both idTokens and both players already exist in the DB.
  async function getPlayersFromDB(
    game: GameState
  ): Promise<[db.dbPlayer | null, db.dbPlayer | null]> {
    if (!game.idTokens[0] || !game.idTokens[1]) return [null, null];

    const creator = await db.getPlayer(game.idTokens[0]);
    const joiner = await db.getPlayer(game.idTokens[1]);
    return [creator, joiner];
  }

  // Stores game to db, updates players in db, messages both players about
  // new ratings.
  async function storeGameAndNotifyRatings(game: GameState): Promise<void> {
    if (!clientIdToken) return;

    await db.storeGame(game);
    const [creatorPlayer, joinerPlayer] = await getPlayersFromDB(game);
    if (!creatorPlayer || !joinerPlayer) return;
    const oldRatings = game.ratings;

    const newRatings = [creatorPlayer.rating, joinerPlayer.rating];
    const clientIdx = clientIndex(game, clientIdToken);
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

  // Communicate the the opponent that the client is not coming back
  // and store the game to the DB if it had started.
  async function dealWithLingeringGame(game: GameState): Promise<void> {
    if (!clientIdToken) return;

    const idx = clientIndex(game, clientIdToken);
    if (game.winner === "" && game.arePlayersPresent[idx === 0 ? 1 : 0])
      emitMessageOpponent(M.abandonedGameMsg);

    if (game.winner === "" && game.moveHistory.length > 1) {
      if (playerToMoveHasTimeLeft(game)) {
        const winner =
          clientIdToken === game.idTokens[0] ? "joiner" : "creator";
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
