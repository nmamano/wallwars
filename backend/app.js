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

const randomGameId = () => Math.random().toString(36).substring(2, 8);
const randomBoolean = () => Math.random() < 0.5;

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
    for (let i = 0; i < unjoinedGames.length; i += 1) {
      const gameParams = unjoinedGames[i];
      if (gameParams.gameId === gameId) {
        gameParams.socketIds[1] = socketId;
        gameParams.playerNames[1] = joinerName;
        socket.emit("gameJoined", {
          creatorStarts: gameParams.creatorStarts,
          creatorName: gameParams.playerNames[0],
          timeControl: gameParams.timeControl,
        });
        io.to(gameParams.socketIds[0]).emit(
          "joinerJoined",
          gameParams.playerNames[1]
        );
        unjoinedGames.splice(i, 1); //move the game from unjoined to ongoing
        ongoingGames.push(gameParams);
        console.log("found game");
        console.log("Unjoined games:", unjoinedGames);
        console.log("Ongoing games:", ongoingGames);
        return;
      }
    }
    console.log("game not found");
    socket.emit("gameNotFoundError");
  });

  socket.on("move", (actions, remainingTime) => {
    console.log(`client ${socketId}: move ${actions}`);
    for (let i = 0; i < ongoingGames.length; i += 1) {
      const game = ongoingGames[i];
      const [socketId1, socketId2] = game.socketIds;
      if (socketId === socketId1 || socketId === socketId2) {
        const otherId = socketId === socketId1 ? socketId2 : socketId1;
        io.to(otherId).emit("move", actions, game.turnCount + 1, remainingTime);
        ongoingGames[i].turnCount += 1;
        return;
      }
    }
  });

  socket.on("rematch", (gameId) => {
    console.log(`client ${socketId}: rematch ${gameId}`);
    for (let i = 0; i < ongoingGames.length; i += 1) {
      const gameParams = ongoingGames[i];
      if (gameParams.gameId === gameId) {
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
        return;
      }
    }
  });

  socket.on("endGame", (gameId) => {
    console.log(`client ${socketId}: endGame ${gameId}`);
    purgeGamesOfClient();
    for (let i = 0; i < ongoingGames.length; i += 1) {
      const gameParams = ongoingGames[i];
      if (gameParams.gameId === gameId) {
        console.log("remove ongoing game: ", JSON.stringify(ongoingGames[i]));
        ongoingGames.splice(i, 1); //remove this game
        return;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`socket ${socketId} disconnected`);
    purgeGamesOfClient();
  });

  //remove games created or joined by this client
  const purgeGamesOfClient = () => {
    //remove game(s) created by this client
    for (let i = 0; i < unjoinedGames.length; i += 1) {
      const gameParams = unjoinedGames[i];
      if (gameParams.socketIds[0] === socketId) {
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
      const gameParams = ongoingGames[i];
      if (
        gameParams.socketIds[0] === socketId ||
        gameParams.socketIds[1] === socketId
      ) {
        console.log(
          "remove stale ongoing game: ",
          JSON.stringify(ongoingGames[i])
        );
        ongoingGames.splice(i, 1);
        i -= 1;
      }
    }
  };
});

server.listen(port, () => console.log(`Listening on port ${port}`));
