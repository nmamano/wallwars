// A malformed event drops only that event: the server keeps serving.
const test = require("node:test");
const assert = require("node:assert");
const { startServer, client, once, createGame } = require("./helpers");

test("a malformed event leaves the server serving", async () => {
  const server = await startServer();
  try {
    const A = await client(server);
    // A missing payload throws when the parameters are destructured, before
    // the async body runs: these are sync throws.
    A.emit("move");
    A.emit("getGame");
    A.emit("changeName", null);
    A.emit("joinGame", null);
    // This one passes the destructuring and fails inside the async body (a
    // number has no toLowerCase): a rejected promise.
    A.emit("changeName", { name: 123 });
    A.emit("pingServer");
    await once(A, "pongFromServer");
    assert.ok(!server.exited, "server exited:\n" + server.output);

    // A second client can still play.
    const B = await client(server);
    const created = await createGame(B, false);
    assert.ok(created.joinCode);
    for (const event of ["move", "getGame", "changeName", "joinGame"]) {
      assert.ok(server.output.includes(`Dropped event ${event} from`), `no log line for ${event}`);
    }
    const changeNameDrops = server.output.split("Dropped event changeName from").length - 1;
    assert.strictEqual(changeNameDrops, 2, server.output);
    assert.ok(server.output.includes("toLowerCase"), "no log line for the rejected promise");
    assert.ok(!server.output.includes("Unhandled rejection"), server.output);
    assert.ok(!server.output.includes("Uncaught exception"), server.output);
  } finally {
    await server.stop();
  }
});

test("a login with an idToken that is not a string is refused", async () => {
  const server = await startServer();
  try {
    const A = await client(server);
    for (const idToken of [{ $regex: "^auth0" }, { $ne: null }, 123, ["auth0|x"], ""]) {
      A.emit("logInOrSignUp", { idToken });
      await once(A, "signUpFailed");
    }
    assert.ok(!server.output.includes("Dropped event logInOrSignUp"), server.output);
  } finally {
    await server.stop();
  }
});
