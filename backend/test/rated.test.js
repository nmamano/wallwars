// Rated play is off: a finished game never changes a rating, even when a
// player sends a result that did not happen on the board.
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { startServer, client, once, logIn, signIdToken } = require("./helpers");
const { recordGameResult } = require(path.join(__dirname, "..", "dist", "src", "playerStats.js"));

test("a game result changes the statistics but no rating", () => {
  const player = {
    rating: 1688,
    peakRating: 1702,
    ratingDeviation: 80,
    ratingVolatility: 0.06,
    gameCount: 30,
    winCount: 19,
    drawCount: 2,
    firstGameDate: new Date("2026-01-01"),
    lastGameDate: new Date("2026-10-01"),
  };
  const game = { isRated: true, winner: "creator", startDate: new Date("2026-11-06") };
  recordGameResult(player, game, 1);
  assert.deepStrictEqual(
    [player.rating, player.peakRating, player.ratingDeviation, player.ratingVolatility],
    [1688, 1702, 80, 0.06]
  );
  assert.deepStrictEqual([player.gameCount, player.winCount, player.drawCount], [31, 20, 2]);
  assert.deepStrictEqual(player.lastGameDate, game.startDate);
});

test("a game created as rated is played unrated, also with a forged result", async () => {
  const server = await startServer();
  try {
    const A = await client(server);
    const B = await client(server);
    assert.strictEqual((await logIn(A, await signIdToken("auth0|rated-a"))).event, "signedUp");
    assert.strictEqual((await logIn(B, await signIdToken("auth0|rated-b"))).event, "signedUp");
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
    assert.strictEqual(joined.isRated, false);

    // Two moves, then the creator claims a win that the board does not show.
    const [p1, p2] = created.creatorStarts ? [A, B] : [B, A];
    const move = (s) => s.emit("move", { actions: [[2, 2]], remainingTime: 300, distances: [8, 8] });
    move(p1);
    await once(p2, "moved");
    move(p2);
    await once(p1, "moved");
    A.emit("playerReachedGoal", { winner: "creator" });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    assert.ok(server.output.includes("FAKE_DB stored game isRated=false winner=creator"), server.output);
    for (const socket of [A, B]) {
      assert.ok(!socket.received.some((r) => r.event === "newRatingsNotification"));
    }
  } finally {
    await server.stop();
  }
});
