const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const mongoRequests = require("./mongoose");

const port = process.env.PORT || 4001;
const app = express();
//the server doesn't serve any HTML, but it needs a route to listen for incoming connections
const index = require("./routes/index");
app.use(index);
const server = http.createServer(app);
const io = socketIo(server);

const randomGameId = () => Math.random().toString(36).substring(2, 8);
const randomBoolean = () => Math.random() < 0.5;

class Game {
  constructor() {
    this.gameId = randomGameId(); //code used by the joiner to join
    //number of wins of creator & joiner played with the given gameId code,
    //excluding the current one. this is to distinguish consecutive games
    //played with the same gameId
    this.gameWins = [0, 0];
    this.socketIds = [null, null]; //socked ids of creator & joiner
    this.playerNames = [null, null];
    //object with 2 attributes: duration (in minutes) and increment (in seconds)
    this.timeControl = null;
    this.creatorStarts = randomBoolean();
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
    this.finnishReason = "";
    this.startDate = null;
  }
  addCreator(creatorSocketId, creatorName, timeControl) {
    this.socketIds[0] = creatorSocketId;
    this.playerNames[0] = creatorName;
    this.timeControl = timeControl;
  }
  addJoiner(joinerSocketId, joinerName) {
    this.socketIds[1] = joinerSocketId;
    this.playerNames[1] = joinerName;
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
    this.finnishReason = "";
  }
  addMove(actions, remainingTime) {
    if (this.moveHistory.length === 0) this.startDate = Date.now();
    this.moveHistory.push({ actions: actions, remainingTime: remainingTime });
  }
  removeMove() {
    this.moveHistory.pop();
  }
  setGameResult(winner, reason) {
    this.winner = winner;
    this.finnishReason = reason;
  }
  turnCount() {
    return this.moveHistory.length;
  }
}

//if there were many concurrent users, this should be converted into a map
//to avoid linear search. Not needed for now
const unjoinedGames = [];
//games stay in ongoingGames until a rematch starts or one of the players leaves
//the game page, so they are not removed immediately when the game ends
const ongoingGames = [];

const unjoinedGameIndex = (gameId) => {
  for (let i = 0; i < unjoinedGames.length; i += 1) {
    const game = unjoinedGames[i];
    if (game.gameId === gameId) return i;
  }
  return -1;
};

const ongoingGameIndexOfClient = (socketId) => {
  for (let i = 0; i < ongoingGames.length; i += 1) {
    const game = ongoingGames[i];
    const [socketId1, socketId2] = game.socketIds;
    if (socketId === socketId1 || socketId === socketId2) return i;
  }
  return -1;
};

//Precondition: the client is in some ongoing game
const getOpponent = (socketId) => {
  const i = ongoingGameIndexOfClient(socketId);
  const game = ongoingGames[i];
  const [socketId1, socketId2] = game.socketIds;
  return socketId === socketId1 ? socketId2 : socketId1;
};

//in theory, clients can only have one unjoined game at a time,
//but we check all to be sure
const removeUnjoinedGamesOfClient = (socketId) => {
  for (let i = 0; i < unjoinedGames.length; i += 1) {
    const game = unjoinedGames[i];
    if (game.socketIds[0] === socketId) {
      console.log("remove unjoined game: ", JSON.stringify(game));
      //unjoined games are not stored in the database
      unjoinedGames.splice(i, 1);
      i -= 1;
    }
  }
};

//in theory, clients can only have one unjoined game at a time,
//but we check all to be sure
const removeOngoingGamesOfClient = (socketId) => {
  for (let i = 0; i < ongoingGames.length; i += 1) {
    const game = ongoingGames[i];
    if (game.socketIds[0] === socketId || game.socketIds[1] === socketId) {
      console.log("remove ongoing game: ", JSON.stringify(game));
      ongoingGames.splice(i, 1);
      i -= 1;
    }
  }
};

//remove any games associated with this client
const removeGamesOfClient = (socketId) => {
  removeUnjoinedGamesOfClient(socketId);
  removeOngoingGamesOfClient(socketId);
};

io.on("connection", (socket) => {
  const socketId = socket.id;
  const shortId = socketId.substring(0, 6); //shortened for printing console messages
  console.log(`new connection: ${shortId}`);

  socket.on("createGame", (creatorName, timeControl) => {
    removeGamesOfClient(socketId); //ensure there's no other game for this client
    console.log(`${shortId}: createGame`);
    const game = new Game();
    game.addCreator(socketId, creatorName, timeControl);
    unjoinedGames.push(game);
    socket.emit("gameCreated", {
      gameId: game.gameId,
      creatorStarts: game.creatorStarts,
    });
    console.log("Unjoined games:", unjoinedGames);
  });

  socket.on("joinGame", (gameId, joinerName) => {
    removeGamesOfClient(socketId); //ensure there's no other game for this client
    console.log(`${shortId}: joinGame ${gameId}`);
    const i = unjoinedGameIndex(gameId);
    if (i === -1) {
      console.log("game not found");
      socket.emit("gameJoinFailed");
      return;
    }
    const game = unjoinedGames[i];
    game.addJoiner(socketId, joinerName);
    socket.emit("gameJoined", {
      creatorName: game.playerNames[0],
      timeControl: game.timeControl,
      creatorStarts: game.creatorStarts,
    });
    io.to(game.socketIds[0]).emit("joinerJoined", joinerName);
    //move the game from unjoined to ongoing
    unjoinedGames.splice(i, 1);
    ongoingGames.push(game);
    // console.log("Unjoined games:", unjoinedGames);
    // console.log("Ongoing games:", ongoingGames);
  });

  //if this move caused a draw or win, the winner is passed,
  //for any other move, winner is ''
  socket.on("move", (actions, remainingTime) => {
    console.log(`${shortId}: move`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    const game = ongoingGames[i];
    if (game.winner !== "") {
      console.error("move on finished game");
      return;
    }
    game.addMove(actions, remainingTime);
    io.to(getOpponent(socketId)).emit(
      "opponentMoved",
      actions,
      game.turnCount(),
      remainingTime
    );
  });

  socket.on("offerRematch", () => {
    console.log(`${shortId}: offerRematch`);
    if (ongoingGameIndexOfClient(socketId) === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    io.to(getOpponent(socketId)).emit("rematchOffered");
  });

  socket.on("rejectRematch", () => {
    console.log(`${shortId}: rejectRematch`);
    if (ongoingGameIndexOfClient(socketId) === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    io.to(getOpponent(socketId)).emit("rematchRejected");
  });

  socket.on("acceptRematch", () => {
    console.log(`${shortId}: acceptRematch`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    ongoingGames[i].setupRematch();
    io.to(getOpponent(socketId)).emit("rematchAccepted");
  });

  socket.on("resign", () => {
    console.log(`${shortId}: resign`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    const game = ongoingGames[i];
    const winner = socketId === game.socketIds[0] ? "joiner" : "creator";
    game.setGameResult(winner, "resign");
    io.to(getOpponent(socketId)).emit("opponentResigned");
    mongoRequests.storeGame(game);
  });
  socket.on("offerDraw", () => {
    console.log(`${shortId}: offerDraw`);
    if (ongoingGameIndexOfClient(socketId) === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    io.to(getOpponent(socketId)).emit("drawOffered");
  });
  socket.on("acceptDraw", () => {
    console.log(`${shortId}: acceptDraw`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    const game = ongoingGames[i];
    game.setGameResult("draw", "agreement");
    io.to(getOpponent(socketId)).emit("drawAccepted");
    mongoRequests.storeGame(game);
  });
  socket.on("rejectDraw", () => {
    console.log(`${shortId}: rejectDraw`);
    if (ongoingGameIndexOfClient(socketId) === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    io.to(getOpponent(socketId)).emit("drawRejected");
  });

  socket.on("requestTakeback", () => {
    console.log(`${shortId}: requestTakeback`);
    if (ongoingGameIndexOfClient(socketId) === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    io.to(getOpponent(socketId)).emit("takebackRequested");
  });
  socket.on("acceptTakeback", () => {
    console.log(`${shortId}: acceptTakeback`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    ongoingGames[i].removeMove();
    io.to(getOpponent(socketId)).emit("takebackAccepted");
  });
  socket.on("rejectTakeback", () => {
    console.log(`${shortId}: rejectTakeback`);
    if (ongoingGameIndexOfClient(socketId) === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    io.to(getOpponent(socketId)).emit("takebackRejected");
  });

  socket.on("giveExtraTime", () => {
    console.log(`${shortId}: giveExtraTime`);
    if (ongoingGameIndexOfClient(socketId) === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    io.to(getOpponent(socketId)).emit("extraTimeReceived");
  });

  socket.on("playerWonOnTime", (winner) => {
    console.log(`${shortId}: playerWonOnTime ${winner}`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    const game = ongoingGames[i];
    game.setGameResult(winner, "time");
    mongoRequests.storeGame(game);
  });

  socket.on("playerReachedGoal", (winner) => {
    console.log(`${shortId}: playerReachedGoal ${winner}`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      socket.emit("gameNotFoundError");
      return;
    }
    const game = ongoingGames[i];
    game.setGameResult(winner, "goal");
    mongoRequests.storeGame(game);
  });

  socket.on("leaveGame", () => {
    console.log(`${shortId}: leaveGame`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) return;
    io.to(getOpponent(socketId)).emit("opponentLeft");
    const game = ongoingGames[i];
    if (game.winner === "") {
      const winner = socketId === game.socketIds[0] ? "joiner" : "creator";
      game.setGameResult(winner, "disconnect");
      mongoRequests.storeGame(game);
    }
    removeGamesOfClient(socketId);
  });

  socket.on("disconnect", () => {
    console.log(`closed connection: ${shortId}`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) return;
    io.to(getOpponent(socketId)).emit("opponentLeft");
    const game = ongoingGames[i];
    if (game.winner === "") {
      const winner = socketId === game.socketIds[0] ? "joiner" : "creator";
      game.setGameResult(winner, "disconnect");
      mongoRequests.storeGame(game);
    }
    removeGamesOfClient(socketId);
  });

  socket.on("getAllGames", () => {
    return mongoRequests.getAllGames();
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
