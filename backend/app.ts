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
import { uniqueNamesGenerator, names } from "unique-names-generator";

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
  // Inject middleware to log incoming messages.
  const originalOn = socket.on;
  socket.on = function (this: any, event: string, listener: Function): any {
    const wrappedListener = function (this: any, ...args: any[]) {
      logReceivedMessage(event, args[0]);
      listener.apply(this, args);
    };
    return originalOn.call(this, event, wrappedListener);
  };

  // idToken identifies the (human) user associated with this socket connection.
  // It is a persistent and unique id for each user (it is the key in the
  // player DB table). It is empty for non-logged in users (guests).
  // All connections start as guests. The idToken is set when a client sends the
  // logInOrSignUp message, which includes their idToken.
  //
  // The idToken should not be confused with socket.id, which identifies the
  // connection itself and is used to route messages to the appropriate client.
  // The socket.id is never empty, even for guest users. Events like refreshing
  // the browser create a new socket connection/id.
  //
  // Id tokens allow things like continuing a game from a different device.
  // Changing devices creates a new socket connection/id, but the game can still
  // be identified by the idToken (continuing from a different connection is not
  // possible for guests).
  let idToken = "";

  const isGuest = () => idToken === "";
  const isLoggedIn = () => idToken !== "";

  ////////////////////////////////////
  // New connection start-up.
  ////////////////////////////////////
  logReceivedMessage(M.connectionMsg);
  ChallengeBC.addSubscriber(socket);

  ////////////////////////////////////
  // Process incoming messages.
  ////////////////////////////////////
  socket.on(
    M.logInOrSignUpMsg,
    async function ({
      idToken: receivedIdToken,
    }: {
      idToken: string;
    }): Promise<void> {
      if (receivedIdToken === "") {
        console.error("Received empty idToken");
        emitMessage(M.signUpFailedMsg);
        return;
      }

      // Tie this socket connection with the received idToken.
      idToken = receivedIdToken;

      const player = await db.getPlayer(idToken);

      // Case 1: player already exists, do a log in.
      if (player) {
        // Tell the client its name.
        emitMessage(M.loggedInMsg, { name: player.name });

        // Update the socket id of games with this idToken.
        const oldSocketId = GM.getSocketIdByIdToken(idToken);
        GM.updateSocketIdByIdToken(idToken, socket.id);

        if (oldSocketId) {
          // TODO: send a message to the old socket id, stating that the player
          // has logged in from another connection, and that the old connection
          // cannot be used anymore. And then terminate the connection.
        }
        return;
      }

      // Case 2: player does not exist yet, do a sign up.
      // Get a random and unique name for the client and save it in the DB.
      const newName = await uniqueRandPlayerName();
      if (newName === "") {
        console.error("Could not find a unique name for new player");
        emitMessage(M.signUpFailedMsg);
        return;
      }
      const currentDate = new Date();
      const success = await db.addNewPlayer(idToken, newName, currentDate);
      if (success) {
        emitMessage(M.signedUpMsg, { name: newName });
      } else {
        emitMessage(M.signUpFailedMsg);
      }
    }
  );

  socket.on(
    M.createGameMsg,
    async function ({
      token,
      timeControl,
      boardSettings,
      isPublic,
      isRated,
    }: {
      token: string;
      timeControl: TimeControl;
      boardSettings: BoardSettings;
      isPublic: boolean;
      isRated: boolean;
    }): Promise<void> {
      const ongoingGame = GM.getOngoingGameByClient(idToken, socket.id);
      if (ongoingGame) await dealWithLingeringGame(ongoingGame);
      // Ensure there's no other game for this client.
      GM.removeGamesByClient(idToken, socket.id);

      // Get the named and rating of the client from the DB if it is logged in,
      // or the default guest name and rating otherwise.
      let name = "Guest";
      let rating = initialRating().rating;
      if (isLoggedIn()) {
        const clientPlayer = await db.getPlayer(idToken);
        if (!clientPlayer) {
          emitMessage(M.createGameFailedMsg);
          console.error(`Player with id token ${idToken} not found in DB.`);
          return;
        }
        name = clientPlayer.name;
        rating = clientPlayer.rating;
      }

      const game = newGame();
      addCreator({
        game,
        socketId: socket.id,
        name,
        token,
        timeControl,
        boardSettings,
        idToken,
        isPublic,
        rating,
        isRated,
      });
      GM.addUnjoinedGame(game);
      emitMessage(M.gameCreatedMsg, {
        joinCode: game.joinCode,
        creatorStarts: game.creatorStarts,
        rating,
      });
      if (isPublic) ChallengeBC.notifyNewChallenge(game);
    }
  );

  socket.on(
    M.joinGameMsg,
    async function ({
      joinCode,
      token,
    }: {
      joinCode: string;
      token: string;
    }): Promise<void> {
      const ongoingGame = GM.getOngoingGameByClient(idToken, socket.id);
      if (ongoingGame) await dealWithLingeringGame(ongoingGame);

      const game = GM.unjoinedGame(joinCode);
      if (!game || !game.socketIds[0]) {
        emitMessage(M.gameJoinFailedMsg);
        return;
      }
      if (
        (isLoggedIn() && idToken === game.idTokens[0]) ||
        game.socketIds[0] === socket.id
      ) {
        emitMessage(M.joinSelfGameFailedMsg);
        return;
      }
      // Ensure there's no other game for this client.
      GM.removeGamesByClient(idToken, socket.id);

      // Get the name and rating of the client from the DB if it is logged in,
      // or the default guest name and rating otherwise.
      let name = "Guest";
      let joinerRating = initialRating().rating;
      if (isLoggedIn()) {
        const clientPlayer = await db.getPlayer(idToken);
        if (!clientPlayer) {
          emitMessage(M.gameJoinFailedMsg);
          console.error(`Client id token ${idToken} not found in DB.`);
          return;
        }
        name = clientPlayer.name;
        joinerRating = clientPlayer.rating;
      }

      let creatorRating = initialRating().rating;
      if (game.idTokens[0] !== "") {
        const oppPlayer = await db.getPlayer(game.idTokens[0]);
        if (!oppPlayer) {
          emitMessage(M.gameJoinFailedMsg);
          console.error(
            `Creator id token ${game.idTokens[0]} not found in DB.`
          );
          return;
        }
        creatorRating = oppPlayer.rating;
      }

      addJoiner({
        game,
        socketId: socket.id,
        name,
        token,
        idToken,
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
        creatorRating,
        joinerRating,
        isRated: game.isRated,
      });
      emitMessageOpponent(M.joinerJoinedMsg, {
        joinerName: name,
        joinerToken: token,
        joinerRating,
      });
      if (game.isPublic) {
        // Remove game from the list of open challenges.
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
      const game = GM.getOngoingGameByClient(idToken, socket.id);
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
        actions,
        moveIndex: turnCount(game),
        remainingTime,
      });
    }
  );

  socket.on(M.offerRematchMsg, function (): void {
    if (!GM.hasOngoingGame(idToken, socket.id)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchOfferedMsg);
  });

  socket.on(M.rejectRematchMsg, function (): void {
    if (!GM.hasOngoingGame(idToken, socket.id)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.rematchRejectedMsg);
  });

  socket.on(M.acceptRematchMsg, async function (): Promise<void> {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    if (!game) {
      emitGameNotFoundError();
      return;
    }

    // Get the ratings of the players from the DB, if they are not guests.
    let newRatings: [number, number] = [
      initialRating().rating,
      initialRating().rating,
    ];
    const [creatorPlayer, joinerPlayer] = await getPlayersFromDB(game);
    if (creatorPlayer) newRatings[0] = creatorPlayer.rating;
    if (joinerPlayer) newRatings[1] = joinerPlayer.rating;
    setupRematch(game, newRatings);

    emitMessageOpponent(M.rematchAcceptedMsg);
  });

  socket.on(M.resignMsg, async function (): Promise<void> {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    // Set the winner and store the game in the DB.
    if (game.winner !== "") {
      // If the winner is already set, it means that the game is already in the
      // DB. Nothing to do.
      return;
    }

    let winner: "creator" | "joiner" = "creator";
    if (isLoggedIn()) {
      if (idToken === game.idTokens[0]) {
        winner = "joiner";
      } else if (idToken === game.idTokens[1]) {
        winner = "creator";
      }
    } else if (socket.id === game.socketIds[0]) {
      winner = "joiner";
    } else if (socket.id === game.socketIds[1]) {
      winner = "creator";
    } else {
      console.error("received resign from unknown player");
      return;
    }

    emitMessageOpponent(M.resignedMsg);
    setResult(game, winner, "resign");
    await storeGameAndNotifyRatings(game);
  });

  socket.on(M.offerDrawMsg, function (): void {
    if (!GM.hasOngoingGame(idToken, socket.id)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawOfferedMsg);
  });

  socket.on(M.acceptDrawMsg, async function (): Promise<void> {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
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
    if (!GM.hasOngoingGame(idToken, socket.id)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.drawRejectedMsg);
  });

  socket.on(M.requestTakebackMsg, function (): void {
    if (!GM.hasOngoingGame(idToken, socket.id)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRequestedMsg);
  });

  socket.on(M.acceptTakebackMsg, function (): void {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    if (!game) {
      emitGameNotFoundError();
      return;
    }
    const oppSocketId = GM.getOpponentSocketId(idToken, socket.id);
    if (!oppSocketId) {
      console.log("error: opponent socket id not found");
      return;
    }
    applyTakeback(game, oppSocketId);
    emitMessageOpponent(M.takebackAcceptedMsg);
  });

  socket.on(M.rejectTakebackMsg, function (): void {
    if (!GM.hasOngoingGame(idToken, socket.id)) {
      emitGameNotFoundError();
      return;
    }
    emitMessageOpponent(M.takebackRejectedMsg);
  });

  socket.on(M.giveExtraTimeMsg, function (): void {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    if (!game) {
      emitGameNotFoundError();
      return;
    }

    const oppSocketId = GM.getOpponentSocketId(idToken, socket.id);
    if (!oppSocketId) {
      console.log("error: opponent socket id not found");
      return;
    }
    applyGiveExtraTime(game, oppSocketId);
    emitMessageOpponent(M.extraTimeReceivedMsg);
  });

  socket.on(
    M.playerWonOnTimeMsg,
    async function ({
      winner,
    }: {
      winner: "creator" | "joiner";
    }): Promise<void> {
      const game = GM.getOngoingGameByClient(idToken, socket.id);
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
      const game = GM.getOngoingGameByClient(idToken, socket.id);
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
    const unjoinedGame = GM.getUnjoinedGameByClient(idToken, socket.id);
    if (unjoinedGame) ChallengeBC.notifyDeadChallenge(unjoinedGame.joinCode);
    GM.removeUnjoinedGamesByClient(idToken, socket.id);
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    if (!game) return;
    const idx = clientIndex(game, idToken, socket.id);
    if (idx === null) return;
    game.arePlayersPresent[idx] = false;
    emitMessageOpponent(M.leftGameMsg);
    if (game.winner !== "") GM.removeOngoingGamesByClient(idToken, socket.id);
  }

  socket.on(M.leaveGameMsg, function (): void {
    handleClientLeaving();
  });

  socket.on(M.disconnectMsg, function (): void {
    ChallengeBC.removeSubscriber(socket.id);
    handleClientLeaving();
  });

  socket.on(M.pingServerMsg, function (): void {
    emitMessage(M.pongFromServerMsg);
  });

  socket.on(
    M.changeNameMsg,
    async function ({ name }: { name: string }): Promise<void> {
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
      if (isGuest()) {
        emitMessage(M.nameChangeFailedMsg, {
          reason: "Guests cannot change names",
        });
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
        emitMessage(M.nameChangeFailedMsg, { reason: "Server error" });
      } else {
        // The input name is passed back in the response in case the client sent
        // multiple changeName messages, so it knows which one the server is
        // responding to.
        emitMessage(M.nameChangedMsg, { name });
      }
    }
  );

  socket.on(
    M.getGameMsg,
    async function ({ gameId }: { gameId: string }): Promise<void> {
      // In the future, this should also handle live games.
      const game = await db.getGame(gameId);
      if (game) emitMessage(M.requestedGameMsg, { game });
      else emitMessage(M.gameNotFoundErrorMsg);
    }
  );

  socket.on(M.getRandomGameMsg, async function (): Promise<void> {
    const game = await db.getRandomGame();
    if (game) emitMessage(M.requestedRandomGameMsg, { game });
    else emitMessage(M.randomGameNotFoundMsg);
  });

  socket.on(M.requestCurrentChallengesMsg, function (): void {
    const challenges = GM.getOpenChallenges();
    emitMessage(M.requestedCurrentChallengesMsg, { challenges });
  });

  socket.on(
    M.getRankingMsg,
    async function ({ count }: { count: number }): Promise<void> {
      const ranking = await db.getRanking(count);
      if (ranking) {
        emitMessage(M.requestedRankingMsg, { ranking });
      } else emitMessage(M.rankingNotFoundMsg);
    }
  );

  socket.on(M.getSolvedPuzzlesMsg, async function (): Promise<void> {
    let solvedPuzzles: string[] = [];
    if (isLoggedIn()) {
      const player = await db.getPlayer(idToken);
      if (player) {
        solvedPuzzles = player.solvedPuzzles;
      } else {
        emitMessage(M.solvedPuzzlesNotFoundMsg);
        return;
      }
    }
    emitMessage(M.requestedSolvedPuzzlesMsg, { solvedPuzzles });
  });

  socket.on(
    M.solvedPuzzleMsg,
    async function ({ puzzleId }: { puzzleId: string }): Promise<void> {
      if (isGuest()) {
        // We do not track solved puzzles for guests.
        return;
      }
      await db.addPlayerSolvedPuzzle(idToken, puzzleId);
    }
  );

  socket.on(
    M.getRecentGameSummariesMsg,
    async function ({ count }: { count: number }): Promise<void> {
      const recentGameSummaries = await db.getRecentGameSummaries(count);
      if (recentGameSummaries)
        emitMessage(M.requestedRecentGameSummariesMsg, {
          recentGameSummaries: recentGameSummaries,
        });
      else emitMessage(M.recentGameSummariesNotFoundMsg);
    }
  );

  socket.on(M.checkHasOngoingGameMsg, function (): void {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    emitMessage(M.respondHasOngoingGameMsg, { res: game !== null });
  });

  socket.on(M.returnToOngoingGameMsg, function (): void {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    if (!game) {
      emitMessage(M.ongoingGameNotFoundMsg);
      return;
    }
    const idx = clientIndex(game, idToken, socket.id);
    if (idx === null) {
      console.error("Client index not found");
      emitMessage(M.ongoingGameNotFoundMsg);
      return;
    }
    game.arePlayersPresent[idx] = true;
    // Remove the id token of the opponent, which is secret.
    let gameWithoutIdTokens = JSON.parse(JSON.stringify(game));
    delete gameWithoutIdTokens.idTokens;
    emitMessage(M.returnedToOngoingGameMsg, {
      ongoingGame: gameWithoutIdTokens,
      isCreator: idx === 0,
      timeLeft: timeLeftByPlayer(game),
    });
    emitMessageOpponent(M.opponentReturnedMsg);
  });

  ////////////////////////////////////
  // Utility functions.
  ////////////////////////////////////

  function logReceivedMessage(msgTitle: string, msgParams?: any): void {
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    logMessage({
      idToken,
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
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    logMessage({
      idToken,
      socketId: socket.id,
      game,
      sent: true,
      messageTitle: msgTitle,
      messageParams: msgParams,
    });
  }

  function emitMessageOpponent(msgTitle: string, msgParams?: any): void {
    const oppSocketId = GM.getOpponentSocketId(idToken, socket.id);
    const oppIdToken = GM.getOpponentIdToken(idToken, socket.id);
    if (!oppSocketId) {
      console.log(`error: couldn't send message ${msgTitle} to opponent`);
      return;
    }
    if (msgParams) io.to(oppSocketId).emit(msgTitle, msgParams);
    else io.to(oppSocketId).emit(msgTitle);
    const game = GM.getOngoingGameByClient(idToken, socket.id);
    logMessage({
      idToken: oppIdToken ? oppIdToken : "",
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

  async function getPlayersFromDB(
    game: GameState
  ): Promise<[db.dbPlayer | null, db.dbPlayer | null]> {
    return [
      await db.getPlayer(game.idTokens[0]),
      await db.getPlayer(game.idTokens[1]),
    ];
  }

  // Stores game to db, updates players in db, messages both players about
  // new ratings.
  async function storeGameAndNotifyRatings(game: GameState): Promise<void> {
    // Store game and updated player statistics to DB.
    await db.storeGameAndUpdatePlayers(game);

    // Message new ratings to both players.
    if (!game.isRated) {
      // If the game is not rated, there is no rating update, so we have
      // nothing to do.
      return;
    }
    const [creatorPlayer, joinerPlayer] = await getPlayersFromDB(game);
    if (!creatorPlayer || !joinerPlayer) {
      // If either player is a guest, there is no rating update, so we have
      // nothing to do.
      return;
    }
    const oldRatings = game.ratings;

    const newRatings = [creatorPlayer.rating, joinerPlayer.rating];
    const clientIdx = clientIndex(game, idToken, socket.id);
    const opponentIdx = clientIdx === 0 ? 1 : 0;
    emitMessage(M.newRatingsNotificationMsg, {
      clientIdx,
      oldRatings,
      newRatings,
    });
    emitMessageOpponent(M.newRatingsNotificationMsg, {
      clientIdx: opponentIdx,
      oldRatings,
      newRatings,
    });
  }

  // Communicate to the opponent that the client is not coming back, mark the
  // client as the loser if the game is still ongoing, and store the game to the
  // DB if not saved yet.
  async function dealWithLingeringGame(game: GameState): Promise<void> {
    const idx = clientIndex(game, idToken, socket.id);
    if (idx === null) return;
    if (game.winner !== "") {
      // Games that already have an assigned winner are already been saved in
      // the DB. Nothing else to do.
      return;
    }

    // Notify the opponent that the client is not coming back.
    if (game.arePlayersPresent[idx === 0 ? 1 : 0])
      emitMessageOpponent(M.abandonedGameMsg);

    // Set the person who abandoned the game as loser, and store the game in the
    // db.
    if (game.moveHistory.length > 1) {
      if (playerToMoveHasTimeLeft(game)) {
        const winner = idx === 0 ? "joiner" : "creator";
        setResult(game, winner, "abandon");
      } else {
        const winner = creatorToMove(game) ? "joiner" : "creator";
        setResult(game, winner, "time");
      }
      await storeGameAndNotifyRatings(game);
    }
  }
});

function randPlayerName(): string {
  return uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  }).slice(0, 10);
}

// Returns a random player name that is not already in the DB. Returns an empty
// string if no unique name could be found.
async function uniqueRandPlayerName(): Promise<string> {
  let name = randPlayerName();
  let tries = 20;
  while (tries > 0) {
    if (await db.nameExists(name)) {
      name = randPlayerName();
      tries--;
    } else break;
  }
  return tries === 0 ? "" : name;
}

server.listen(port, () => console.log(`Listening on port ${port}`));
