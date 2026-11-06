// Starts the built server (dist/app.js) in a child process with the in-memory
// database, and gives socket.io clients to talk to it.
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const { io } = require("socket.io-client");

const backendDir = path.join(__dirname, "..");

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    ["--require", "./test/fake-db.js", "dist/app.js"],
    {
      cwd: backendDir,
      env: { ...process.env, PORT: String(port), APP_SOCKET: "", LOG_MESSAGES: "" },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  const server = { port, child, output: "", exited: false, clients: [] };
  child.stdout.on("data", (d) => (server.output += d));
  child.stderr.on("data", (d) => (server.output += d));
  child.on("exit", () => (server.exited = true));
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("server did not start:\n" + server.output)), 10000);
    const check = () => {
      if (server.output.includes(`Listening on port ${port}`)) {
        clearTimeout(t);
        resolve();
      } else if (server.exited) {
        clearTimeout(t);
        reject(new Error("server exited:\n" + server.output));
      } else setTimeout(check, 50);
    };
    check();
  });
  server.url = `http://127.0.0.1:${port}`;
  server.stop = () => {
    for (const s of server.clients) s.disconnect();
    child.kill();
    return new Promise((resolve) => (server.exited ? resolve() : child.on("exit", resolve)));
  };
  return server;
}

// A client that records every event it receives, with its payload.
function client(server) {
  return new Promise((resolve, reject) => {
    const s = io(server.url, { transports: ["websocket"], forceNew: true, reconnection: false });
    server.clients.push(s);
    s.received = [];
    s.onAny((event, ...args) => s.received.push({ event, args }));
    const t = setTimeout(() => reject(new Error("connect timeout")), 5000);
    s.on("connect", () => {
      clearTimeout(t);
      resolve(s);
    });
  });
}

function once(socket, event, ms = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

const boardSettings = {
  dims: [15, 19],
  startPos: [[0, 0], [0, 18]],
  goalPos: [[14, 18], [14, 0]],
};

function createGame(socket, isPublic) {
  socket.emit("createGame", {
    token: "default",
    timeControl: { duration: 5, increment: 2 },
    boardSettings,
    isPublic,
    isRated: false,
  });
  return once(socket, "gameCreated");
}

module.exports = { startServer, client, once, createGame };
