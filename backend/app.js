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

const randomGameId = () => Math.random().toString(36).substring(2, 8);
const randomBoolean = () => Math.random() < 0.5;

io.on("connection", (socket) => {
  const clientId = socket.id;
  console.log(`new socket connection from client ${clientId}`);

  socket.on("createGame", (creatorParams) => {
    console.log(`client ${clientId} requests createGame`);
    const gameParams = {
      gameId: randomGameId(),
      playerClientIds: [clientId, null],
      playerNames: [creatorParams.p1Name, "______"],
      timeControl: creatorParams.timeControl,
      p1Starts: randomBoolean(),
    };
    unjoinedGames.push(gameParams);
    socket.emit("gameCreated", gameParams);
    console.log("Unjoined games:", unjoinedGames);
  });

  socket.on("joinGame", (joinerParams) => {
    const gameId = joinerParams.gameId;
    console.log(`client ${clientId} requests joinGame with gameId ${gameId}`);
    for (let i = 0; i < unjoinedGames.length; i += 1) {
      const gameParams = unjoinedGames[i];
      if (gameParams.gameId === gameId) {
        console.log("found game");
        gameParams.playerNames[1] = joinerParams.p2Name;
        gameParams.playerClientIds[1] = clientId;
        socket.emit("gameJoined", gameParams);
        unjoinedGames.splice(i, 1); //remove the game from unjoined games
        console.log("Unjoined games:", unjoinedGames);
        return;
      }
      socket.emit("gameNotFoundError");
    }
  });

  socket.on("disconnect", () => {
    console.log(`${clientId} disconnected`);
    removeStaleGames();
  });

  //remove previous games created by this client
  const removeStaleGames = () => {
    for (let i = 0; i < unjoinedGames.length; i += 1) {
      const gameParams = unjoinedGames[i];
      if (gameParams.playerClientIds[0] === clientId) {
        unjoinedGames.splice(i, 1); //remove game(s) created by this client
      }
    }
  };
});

server.listen(port, () => console.log(`Listening on port ${port}`));
