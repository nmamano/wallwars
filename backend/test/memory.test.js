// The server keeps games in memory, so it must let go of them: a game that
// both players left is removed after a while, and one game holds a bounded
// number of well-formed moves.
const test = require("node:test");
const assert = require("node:assert");
const { GameManager, abandonedGameMs } = require("../dist/src/GameManager");
const { newGame } = require("../dist/src/gameState");
const { startServer, client, once, createGame } = require("./helpers");

function ongoingGame(GM) {
  const game = newGame();
  game.arePlayersPresent = [true, true];
  GM.ongoingGames.push(game);
  return game;
}

test("a game that both players left is removed after abandonedGameMs", () => {
  const GM = new GameManager();
  const left = ongoingGame(GM);
  const oneStays = ongoingGame(GM);
  const returned = ongoingGame(GM);
  const t = 1_000_000;

  left.arePlayersPresent = [false, true];
  GM.playerLeft(left, t - 10);
  left.arePlayersPresent = [false, false];
  GM.playerLeft(left, t);

  oneStays.arePlayersPresent = [true, false];
  GM.playerLeft(oneStays, t);

  returned.arePlayersPresent = [false, false];
  GM.playerLeft(returned, t);
  returned.arePlayersPresent = [true, false]; // a logged-in player came back

  GM.removeAbandonedGames(t + abandonedGameMs - 1);
  assert.deepStrictEqual(GM.ongoingGames, [left, oneStays, returned]);
  GM.removeAbandonedGames(t + abandonedGameMs);
  assert.deepStrictEqual(GM.ongoingGames, [oneStays, returned]);

  // Leaving again starts the wait again.
  returned.arePlayersPresent = [false, false];
  GM.playerLeft(returned, t + abandonedGameMs);
  GM.removeAbandonedGames(t + 2 * abandonedGameMs - 1);
  assert.deepStrictEqual(GM.ongoingGames, [oneStays, returned]);
  GM.removeAbandonedGames(t + 2 * abandonedGameMs);
  assert.deepStrictEqual(GM.ongoingGames, [oneStays]);
});

const movedCount = (socket) => socket.received.filter((r) => r.event === "moved").length;

async function waitForMoved(socket, n) {
  for (let i = 0; i < 100 && movedCount(socket) < n; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await new Promise((resolve) => setTimeout(resolve, 300)); // let extra ones arrive
  return movedCount(socket);
}

test("malformed moves are dropped and one game holds at most 1000 moves", async () => {
  const server = await startServer();
  try {
    const A = await client(server);
    const B = await client(server);
    const created = await createGame(A, false); // 15x19 board
    B.emit("joinGame", { joinCode: created.joinCode, token: "default" });
    await once(B, "gameJoined");

    const ok = { actions: [[2, 2]], remainingTime: 300, distances: [8, 8] };
    const bad = [
      { ...ok, actions: [] },
      { ...ok, actions: [[2, 2], [2, 4], [2, 6]] },
      { ...ok, actions: [[2, 2, 2]] },
      { ...ok, actions: [[15, 2]] },
      { ...ok, actions: [[2, -1]] },
      { ...ok, actions: [[2, 1.5]] },
      { ...ok, actions: ["x".repeat(10000)] },
      { ...ok, actions: "x" },
      { ...ok, remainingTime: "300" },
      { ...ok, remainingTime: { big: "x".repeat(10000) } },
      { ...ok, distances: [8] },
      { ...ok, distances: ["x".repeat(10000), 8] },
    ];
    for (const move of bad) A.emit("move", move);
    A.emit("move", ok);
    assert.strictEqual(await waitForMoved(B, 1), 1);
    assert.strictEqual(server.output.split("Dropped malformed move").length - 1, bad.length);

    for (let i = 1; i < 1005; i++) A.emit("move", ok);
    assert.strictEqual(await waitForMoved(B, 1000), 1000);
    assert.ok(server.output.includes("has 1000 moves"), server.output.slice(-2000));
  } finally {
    await server.stop();
  }
});
