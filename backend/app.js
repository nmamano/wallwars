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

  socket.on("createGame", (creatorParams) => {
    console.log(`client ${socketId}: createGame`);
    const gameParams = {
      gameId: randomGameId(),
      socketIds: [socketId, null],
      playerNames: [creatorParams.p1Name, null],
      timeControl: creatorParams.timeControl,
      p1Starts: randomBoolean(),
      numMoves: 0,
    };
    unjoinedGames.push(gameParams);
    socket.emit("gameCreated", {
      gameId: gameParams.gameId,
      p1Starts: gameParams.p1Starts,
    });
    console.log("Unjoined games:", unjoinedGames);
  });

  socket.on("joinGame", (joinerParams) => {
    console.log(`client ${socketId}: joinGame ${joinerParams.gameId}`);
    for (let i = 0; i < unjoinedGames.length; i += 1) {
      const gameParams = unjoinedGames[i];
      if (gameParams.gameId === joinerParams.gameId) {
        gameParams.socketIds[1] = socketId;
        gameParams.playerNames[1] = joinerParams.p2Name;
        socket.emit("gameJoined", {
          p1Starts: gameParams.p1Starts,
          p1Name: gameParams.playerNames[0],
          timeControl: gameParams.timeControl,
        });
        io.to(gameParams.socketIds[0]).emit(
          "p2Joined",
          gameParams.playerNames[1]
        );
        unjoinedGames.splice(i, 1); //move the game from unjoined to ongoing
        ongoingGames.push(gameParams);
        console.log("found game");
        console.log("Unjoined games:", unjoinedGames);
        console.log("Ongoing games:", ongoingGames);
        return;
      }
      socket.emit("gameNotFoundError");
    }
  });

  socket.on("move", (actions, remainingTime) => {
    console.log(`client ${socketId}: move ${[...actions]}`);
    for (let i = 0; i < ongoingGames.length; i += 1) {
      const game = ongoingGames[i];
      const [socketId1, socketId2] = game.socketIds;
      if (socketId === socketId1 || socketId === socketId2) {
        const otherId = socketId === socketId1 ? socketId2 : socketId1;
        io.to(otherId).emit("move", actions, game.numMoves, remainingTime);
        ongoingGames[i].numMoves += 1;
        return;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`socket ${socketId} disconnected`);
    removeStaleGames();
  });

  //remove games created or joined by this client
  const removeStaleGames = () => {
    for (let i = 0; i < unjoinedGames.length; i += 1) {
      const gameParams = unjoinedGames[i];
      if (gameParams.socketIds[0] === socketId) {
        unjoinedGames.splice(i, 1); //remove game(s) created by this client
        i -= 1;
      }
    }
    for (let i = 0; i < ongoingGames.length; i += 1) {
      const gameParams = ongoingGames[i];
      if (
        gameParams.socketIds[0] === socketId ||
        gameParams.socketIds[1] === socketId
      ) {
        ongoingGames.splice(i, 1); //remove game(s) created by this client
        i -= 1;
      }
    }
  };
});

server.listen(port, () => console.log(`Listening on port ${port}`));
