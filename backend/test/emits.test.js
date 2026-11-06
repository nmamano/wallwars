// No payload that the server sends may contain a player's idToken: it is the
// key of the player's account.
const test = require("node:test");
const assert = require("node:assert");
const { startServer, client, once, createGame } = require("./helpers");

const SUB_A = "auth0|creator-secret-sub";
const SUB_C = "auth0|joiner-secret-sub";

async function logIn(socket, idToken) {
  socket.emit("logInOrSignUp", { idToken });
  await Promise.race([once(socket, "signedUp"), once(socket, "loggedIn")]);
}

test("no emitted payload contains an idToken", async () => {
  const server = await startServer();
  try {
    const A = await client(server); // logged in, creates a public game
    const B = await client(server); // guest, reads the open challenges
    const C = await client(server); // logged in, joins the game
    await logIn(A, SUB_A);
    await logIn(C, SUB_C);

    const newChallenge = once(B, "newChallenge");
    const created = await createGame(A, true);
    await newChallenge;
    B.emit("requestCurrentChallenges");
    const { challenges } = await once(B, "requestedCurrentChallenges");
    assert.strictEqual(challenges.length, 1);
    assert.strictEqual(challenges[0].joinCode, created.joinCode);

    C.emit("joinGame", { joinCode: created.joinCode, token: "default" });
    await Promise.all([once(C, "gameJoined"), once(A, "joinerJoined")]);
    A.emit("returnToOngoingGame");
    const { ongoingGame } = await once(A, "returnedToOngoingGame");
    assert.strictEqual(ongoingGame.joinCode, created.joinCode);
    C.emit("returnToOngoingGame");
    await once(C, "returnedToOngoingGame");

    const received = [A, B, C].flatMap((socket) => socket.received);
    assert.ok(received.length > 0);
    for (const { event, args } of received) {
      const text = JSON.stringify(args);
      assert.ok(!text.includes(SUB_A) && !text.includes(SUB_C), `${event} sends an idToken: ${text}`);
    }
    for (const { event, args } of received) {
      const text = JSON.stringify(args);
      assert.ok(!text.includes("idTokens") && !text.includes("socketIds"), `${event}: ${text}`);
    }
  } finally {
    await server.stop();
  }
});
