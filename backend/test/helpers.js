// Starts the built server (dist/app.js) in a child process with the in-memory
// database, and gives socket.io clients to talk to it.
const { spawn } = require("child_process");
const net = require("net");
const path = require("path");
const { io } = require("socket.io-client");
const { generateKeyPair, exportJWK, SignJWT } = require("jose");

const ISSUER = "https://dev-l7k7kmidqclptw4l.us.auth0.com/";
const AUDIENCE = "xhKCco1nI2npeCFC1Q6opf2mHmtKjwDG";

// A key pair made for each test run, and one that the server does not know.
const keys = generateKeyPair("RS256").then(async ({ publicKey, privateKey }) => {
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "RS256", use: "sig" };
  const other = await generateKeyPair("RS256");
  return { jwks: { keys: [jwk] }, privateKey, otherKey: other.privateKey };
});

// An ID token like the ones Auth0 gives. Options change one claim or the key.
async function signIdToken(sub, { issuer = ISSUER, audience = AUDIENCE, expiresIn = "1h", key } = {}) {
  const k = await keys;
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key === "other" ? k.otherKey : k.privateKey);
}

const backendDir = path.join(__dirname, "..");

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// With dbUrl, the server uses that MongoDB instead of the in-memory database.
async function startServer({ dbUrl } = {}) {
  const port = await freePort();
  const { jwks } = await keys;
  const preload = dbUrl ? [] : ["--require", "./test/fake-db.js"];
  const child = spawn(
    process.execPath,
    [...preload, "--require", "./test/fake-auth.js", "dist/app.js"],
    {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: String(port),
        APP_SOCKET: "",
        LOG_MESSAGES: "",
        FAKE_LOGIN: "",
        TEST_JWKS: JSON.stringify(jwks),
        DB_URL: dbUrl || "",
      },
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
      const dbReady = !dbUrl || server.output.includes("mongoose connected");
      if (server.output.includes(`Listening on port ${port}`) && dbReady) {
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

// Sends a login; resolves with the reply event and its payload.
function logIn(socket, idToken) {
  const events = ["signedUp", "loggedIn", "signUpFailed"];
  return new Promise((resolve, reject) => {
    const handlers = {};
    const done = () => events.forEach((e) => socket.off(e, handlers[e]));
    const t = setTimeout(() => {
      done();
      reject(new Error("timeout waiting for a login reply"));
    }, 5000);
    for (const event of events) {
      handlers[event] = (payload) => {
        clearTimeout(t);
        done();
        resolve({ event, payload });
      };
      socket.on(event, handlers[event]);
    }
    socket.emit("logInOrSignUp", { idToken });
  });
}

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

const testKeys = () => keys;

module.exports = { startServer, client, once, createGame, logIn, signIdToken, testKeys };
