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

io.on("connection", (socket) => {
  const clientId = socket.id;
  console.log(`new socket connection from client ${clientId}`);

  socket.on("createGame", (gameParams) => {
    const gameId = gameParams.gameId;
    console.log(`client ${clientId} requests createGame with gameId ${gameId}`);
    gameParams.clientId = clientId;
    unjoinedGames.push(gameParams);
    socket.emit("gameCreated");
    console.log("Unjoined games:", unjoinedGames);
  });

  socket.on("joinGame", (gameId) => {
    console.log(`client ${clientId} requests joinGame with gameId ${gameId}`);
    for (let i = 0; i < unjoinedGames.length; i += 1) {
      const game = unjoinedGames[i];
      if (game.gameId === gameId) {
        console.log("found game");
        socket.emit("gameJoined", game);
        unjoinedGames.splice(i, 1); //remove the game from unjoined games
        console.log("Unjoined games:", unjoinedGames);
        return;
      }
      socket.emit("gameNotFoundError");
    }
  });

  socket.on("disconnect", () => {
    console.log(`${clientId} disconnected`);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
