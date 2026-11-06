// Rated play is off: a finished game never changes a player's ranking, even
// when a player sends a result that did not happen on the board.
const test = require("node:test");
const assert = require("node:assert");
const { MongoClient } = require("mongodb");
const { startServer, client, once, logIn, signIdToken } = require("./helpers");

// Plays one game between two logged-in players: the creator asks for a rated
// game, and after 2 moves claims a win that the board does not show.
async function playForgedWin(server, subA, subB) {
  const A = await client(server);
  const B = await client(server);
  assert.strictEqual((await logIn(A, await signIdToken(subA))).event === "signUpFailed", false);
  assert.strictEqual((await logIn(B, await signIdToken(subB))).event === "signUpFailed", false);
  A.emit("createGame", {
    token: "default",
    timeControl: { duration: 5, increment: 2 },
    boardSettings: { dims: [9, 9], startPos: [[0, 0], [0, 8]], goalPos: [[8, 8], [8, 0]] },
    isPublic: false,
    isRated: true, // the client asks for a rated game
  });
  const created = await once(A, "gameCreated");
  B.emit("joinGame", { joinCode: created.joinCode, token: "default" });
  const joined = await once(B, "gameJoined");
  const [p1, p2] = created.creatorStarts ? [A, B] : [B, A];
  const move = (s) => s.emit("move", { actions: [[2, 2]], remainingTime: 300, distances: [8, 8] });
  move(p1);
  await once(p2, "moved");
  move(p2);
  await once(p1, "moved");
  A.emit("playerReachedGoal", { winner: "creator" });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { A, B, joined };
}

test("a game created as rated is played unrated, also with a forged result", async () => {
  const server = await startServer();
  try {
    const { A, B, joined } = await playForgedWin(server, "auth0|rated-a", "auth0|rated-b");
    assert.strictEqual(joined.isRated, false);
    assert.ok(server.output.includes("FAKE_DB stored game isRated=false winner=creator"), server.output);
    for (const socket of [A, B]) {
      assert.ok(!socket.received.some((r) => r.event === "newRatingsNotification"));
    }
  } finally {
    await server.stop();
  }
});

// Needs a MongoDB: TEST_DB_URL=mongodb://host:port (a database
// wwtest_<pid> is made and dropped). Skipped without it.
const dbUrl = process.env.TEST_DB_URL;
test("a forged win changes no ranking field in the database", { skip: !dbUrl && "TEST_DB_URL not set" }, async () => {
  const dbName = `wwtest_${process.pid}`;
  const url = `${dbUrl.replace(/\/$/, "")}/${dbName}`;
  const mongo = new MongoClient(url);
  await mongo.connect();
  const players = mongo.db(dbName).collection("players");
  const player = (idToken, name) => ({
    idToken, name, lowercaseName: name.toLowerCase(),
    rating: 1688, peakRating: 1702, ratingDeviation: 80, ratingVolatility: 0.06,
    gameCount: 30, winCount: 19, drawCount: 2,
    firstGameDate: new Date("2026-01-01"), lastGameDate: new Date("2026-10-01"),
    solvedPuzzles: [], creationDate: new Date("2025-12-01"),
  });
  await players.insertMany([player("auth0|rank-a", "RankA"), player("auth0|rank-b", "RankB")]);
  const fields = ["rating", "peakRating", "ratingDeviation", "ratingVolatility", "gameCount",
    "winCount", "drawCount", "firstGameDate", "lastGameDate"];
  const read = async () =>
    (await players.find({}, { sort: { name: 1 } }).toArray()).map((p) =>
      Object.fromEntries(fields.map((f) => [f, p[f]])));
  const before = await read();
  const server = await startServer({ dbUrl: url });
  try {
    const { joined } = await playForgedWin(server, "auth0|rank-a", "auth0|rank-b");
    assert.strictEqual(joined.isRated, false);
    const games = await mongo.db(dbName).collection("games").find().toArray();
    assert.strictEqual(games.length, 1, server.output);
    assert.strictEqual(games[0].winner, "creator");
    assert.strictEqual(games[0].isRated, false);
    assert.deepStrictEqual(await read(), before);
  } finally {
    await server.stop();
    await mongo.db(dbName).dropDatabase();
    await mongo.close();
  }
});
