const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = process.env.PORT || 4001;
const app = express();
//the server doesn't serve any HTML, but it needs a route to listen for incoming connections
const index = require("./routes/index");
app.use(index);
const server = http.createServer(app);
const io = socketIo(server);

//this could be a map with gameIds as keys to avoid linear search, not needed for now
const unjoinedGames = [];
const ongoingGames = [];

const unjoinedGameIndex = (gameId) => {
  for (let i = 0; i < unjoinedGames.length; i += 1) {
    const game = unjoinedGames[i];
    if (game.gameId === gameId) return i;
  }
  return -1;
};

// const ongoingGameIndex = (gameId) => {
//   for (let i = 0; i < ongoingGames.length; i += 1) {
//     const game = ongoingGames[i];
//     if (game.gameId === gameId) return i;
//   }
//   return -1;
// };

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

const randomGameId = () => Math.random().toString(36).substring(2, 8);
const randomBoolean = () => Math.random() < 0.5;

//remove games created or joined by a client
const purgeGamesOfClient = (socketId) => {
  for (let i = 0; i < unjoinedGames.length; i += 1) {
    const game = unjoinedGames[i];
    if (game.socketIds[0] === socketId) {
      console.log(
        "remove stale unjoined game: ",
        JSON.stringify(unjoinedGames[i])
      );
      unjoinedGames.splice(i, 1);
      i -= 1;
    }
  }
  //remove game(s) created by this client
  for (let i = 0; i < ongoingGames.length; i += 1) {
    const game = ongoingGames[i];
    if (game.socketIds[0] === socketId || game.socketIds[1] === socketId) {
      console.log(
        "remove stale ongoing game: ",
        JSON.stringify(ongoingGames[i])
      );
      ongoingGames.splice(i, 1);
      i -= 1;
    }
  }
};

io.on("connection", (socket) => {
  const socketId = socket.id;
  console.log(`new connection from socket ${socketId}`);

  socket.on("createGame", (timeControl, creatorName) => {
    purgeGamesOfClient();
    console.log(`client ${socketId}: createGame`);
    const gameParams = {
      gameId: randomGameId(),
      socketIds: [socketId, null],
      playerNames: [creatorName, null],
      timeControl: timeControl,
      creatorStarts: randomBoolean(),
      turnCount: 0,
    };
    unjoinedGames.push(gameParams);
    socket.emit("gameCreated", {
      gameId: gameParams.gameId,
      creatorStarts: gameParams.creatorStarts,
    });
    console.log("Unjoined games:", unjoinedGames);
  });

  socket.on("joinGame", (gameId, joinerName) => {
    purgeGamesOfClient();
    console.log(`client ${socketId}: joinGame ${gameId}`);
    const i = unjoinedGameIndex(gameId);
    if (i === -1) {
      console.log("game not found");
      socket.emit("gameNotFound");
      return;
    }
    console.log("game found");
    const game = unjoinedGames[i];
    game.socketIds[1] = socketId;
    game.playerNames[1] = joinerName;
    socket.emit("gameJoined", {
      creatorStarts: game.creatorStarts,
      creatorName: game.playerNames[0],
      timeControl: game.timeControl,
    });
    io.to(game.socketIds[0]).emit("joinerJoined", joinerName);
    unjoinedGames.splice(i, 1); //move the game from unjoined to ongoing
    ongoingGames.push(game);
    // console.log("Unjoined games:", unjoinedGames);
    // console.log("Ongoing games:", ongoingGames);
  });

  socket.on("move", (actions, remainingTime) => {
    console.log(`client ${socketId}: move ${actions}`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      return;
    }
    const game = ongoingGames[i];
    const opp = getOpponent(socketId);
    io.to(opp).emit("move", actions, game.turnCount + 1, remainingTime);
    game.turnCount += 1;
  });

  socket.on("rematchOffer", () => {
    console.log(`client ${socketId}: rematchOffer`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      return;
    }
    console.log("game found");
    const opp = getOpponent(socketId);
    io.to(opp).emit("rematchOfferReceived");
  });

  socket.on("rematchAccepted", () => {
    console.log(`client ${socketId}: rematchAccepted`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      return;
    }
    console.log("game found");
    const game = ongoingGames.splice(i, 1)[0]; //remove the finished game
    const newGame = {
      gameId: randomGameId(),
      socketIds: game.socketIds,
      playerNames: game.playerNames,
      timeControl: game.timeControl,
      creatorStarts: !game.creatorStarts,
      turnCount: 0,
    };
    ongoingGames.push(newGame);
    io.to(game.socketIds[0])
      .to(game.socketIds[1])
      .emit("rematchStarted", newGame.gameId);
  });

  socket.on("resign", () => {
    console.log(`client ${socketId}: resign`);
    const i = ongoingGameIndexOfClient(socketId);
    if (i === -1) {
      console.error("game not found");
      return;
    }
    console.log("game found");
    const game = ongoingGames[i];
    const resignerIsCreator = game.socketIds[0] === socketId;
    io.to(game.socketIds[0])
      .to(game.socketIds[1])
      .emit("playerResigned", resignerIsCreator);
  });

  socket.on("leaveGame", () => {
    console.log(`client ${socketId}: leaveGame`);
    purgeGamesOfClient();
  });

  socket.on("disconnect", () => {
    console.log(`socket ${socketId} disconnected`);
    purgeGamesOfClient();
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
