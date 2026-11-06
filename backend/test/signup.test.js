// The pool of random sign-up names is finite. A full pool must not stop new
// sign-ups, and a sign-up that fails leaves the socket a guest that can play.
const test = require("node:test");
const assert = require("node:assert");
const { startServer, client, logIn, signIdToken, createGame } = require("./helpers");

test("a sign-up works when every random name is taken", async () => {
  const server = await startServer({ env: { FAKE_DB_NAMES_TAKEN: "letters" } });
  try {
    const names = [];
    for (const sub of ["auth0|full-a", "auth0|full-b", "auth0|full-c"]) {
      const A = await client(server);
      const signUp = await logIn(A, await signIdToken(sub));
      assert.strictEqual(signUp.event, "signedUp", server.output);
      names.push(signUp.payload.name);
      assert.ok((await createGame(A, false)).joinCode);
    }
    // A dictionary name (at most 10 characters) and 5 digits.
    for (const name of names) assert.match(name, /^\D{1,10}\d{5}$/);
    assert.strictEqual(new Set(names).size, names.length);
  } finally {
    await server.stop();
  }
});

test("after a failed sign-up the socket is a guest and can play", async () => {
  const server = await startServer({ env: { FAKE_DB_NAMES_TAKEN: "all" } });
  try {
    const A = await client(server);
    assert.strictEqual((await logIn(A, await signIdToken("auth0|no-name"))).event, "signUpFailed");
    assert.ok((await createGame(A, false)).joinCode);
  } finally {
    await server.stop();
  }
});
