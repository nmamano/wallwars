// A public challenge goes to every lobby visitor, so the server refuses a
// createGame with malformed settings: it is not stored and not broadcast.
const test = require("node:test");
const assert = require("node:assert");
const { startServer, client, once, createGame } = require("./helpers");

const timeControl = { duration: 5, increment: 2 };
const boardSettings = { dims: [9, 9], startPos: [[0, 0], [0, 8]], goalPos: [[8, 8], [8, 0]] };

const bad = [
  { timeControl: null },
  { timeControl: undefined },
  { boardSettings: null },
  { boardSettings: undefined },
  { timeControl: { duration: "5", increment: 2 } },
  { timeControl: { duration: 5 } },
  { timeControl: { duration: 0, increment: 2 } },
  { timeControl: { duration: 1e9, increment: 2 } },
  { timeControl: { duration: 5, increment: -1 } },
  { boardSettings: { dims: [9, 9] } },
  { boardSettings: { ...boardSettings, dims: [9] } },
  { boardSettings: { ...boardSettings, dims: [8, 9] } },
  { boardSettings: { ...boardSettings, dims: [1001, 1001] } },
  { boardSettings: { ...boardSettings, startPos: [[0, 0], [0, 10]] } },
  { boardSettings: { ...boardSettings, goalPos: [[8, 8], null] } },
  { boardSettings: { ...boardSettings, goalPos: [[8, 8], [7, 0]] } },
  { isPublic: "yes" },
];

test("a createGame with malformed settings is refused and not shown in the lobby", async () => {
  const server = await startServer();
  try {
    const A = await client(server);
    const watcher = await client(server);
    for (const fields of bad) {
      A.emit("createGame", { token: "default", timeControl, boardSettings, isPublic: true, ...fields });
      const failed = await once(A, "createGameFailed");
      assert.strictEqual(failed.reason, "Invalid game settings", JSON.stringify(fields));
    }
    // A valid public challenge still goes through, and it is the only one the
    // watcher saw and the only one a new lobby visitor gets.
    const created = await createGame(A, true);
    await once(watcher, "newChallenge");
    assert.deepStrictEqual(
      watcher.received.filter((r) => r.event === "newChallenge").map((r) => r.args[0].challenge.joinCode),
      [created.joinCode]
    );
    const visitor = await client(server);
    visitor.emit("requestCurrentChallenges");
    const { challenges } = await once(visitor, "requestedCurrentChallenges");
    assert.deepStrictEqual(
      challenges.map((c) => c.joinCode),
      [created.joinCode]
    );
  } finally {
    await server.stop();
  }
});
