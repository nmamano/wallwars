// The server logs a user in only with a valid Auth0 ID token, and uses the
// user id (sub) in it as the account key.
const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { createLocalJWKSet } = require("jose");
const { startServer, client, logIn, signIdToken } = require("./helpers");
const { idTokenVerifier } = require(path.join(__dirname, "..", "dist", "src", "auth.js"));

const SUB = "auth0|login-test-user";

// A token with no signature (alg "none").
function unsignedToken(sub) {
  const part = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${part({ alg: "none", typ: "JWT" })}.${part({
    sub,
    iss: "https://dev-l7k7kmidqclptw4l.us.auth0.com/",
    aud: "xhKCco1nI2npeCFC1Q6opf2mHmtKjwDG",
    iat: now,
    exp: now + 3600,
  })}.`;
}

test("the verifier accepts only a valid token", async () => {
  const good = await signIdToken(SUB);
  const header = JSON.parse(Buffer.from(good.split(".")[0], "base64url"));
  assert.strictEqual(header.kid, "test");
  // The same keys that the test server gets.
  const { jwks } = await require("./helpers").testKeys();
  const verify = idTokenVerifier(createLocalJWKSet(jwks));

  assert.strictEqual(await verify(good), SUB);
  assert.strictEqual(await verify(await signIdToken(SUB, { key: "other" })), null);
  assert.strictEqual(await verify(unsignedToken(SUB)), null);
  assert.strictEqual(await verify(await signIdToken(SUB, { issuer: "https://example.com/" })), null);
  assert.strictEqual(await verify(await signIdToken(SUB, { audience: "another-app" })), null);
  assert.strictEqual(await verify(await signIdToken(SUB, { expiresIn: "-10m" })), null);
  assert.strictEqual(await verify(SUB), null); // a bare user id, as clients sent before
  assert.strictEqual(await verify(""), null);
  assert.strictEqual(await verify(undefined), null);
  assert.strictEqual(await verify({ sub: SUB }), null);
});

test("the server logs in with a real token and refuses the others", async () => {
  const server = await startServer();
  try {
    // A real token signs up, and a second real token for the same user logs
    // in to the same account.
    const A = await client(server);
    const signUp = await logIn(A, await signIdToken(SUB));
    assert.strictEqual(signUp.event, "signedUp");
    const B = await client(server);
    const login = await logIn(B, await signIdToken(SUB));
    assert.strictEqual(login.event, "loggedIn");
    assert.strictEqual(login.payload.name, signUp.payload.name);

    // Each forged token is refused, also for a user that exists.
    for (const forged of [
      SUB,
      unsignedToken(SUB),
      await signIdToken(SUB, { key: "other" }),
      await signIdToken(SUB, { expiresIn: "-10m" }),
      "",
    ]) {
      const C = await client(server);
      assert.strictEqual((await logIn(C, forged)).event, "signUpFailed", forged);
      // The socket stays a guest: guests cannot change names.
      C.emit("changeName", { name: "Taken_Over" });
      const reply = await new Promise((resolve) => C.once("nameChangeFailed", resolve));
      assert.strictEqual(reply.reason, "Guests cannot change names");
    }
    assert.ok(!server.output.includes(".ey"), "a token is in the log");
  } finally {
    await server.stop();
  }
});
