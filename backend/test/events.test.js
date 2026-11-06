// A malformed event drops only that event: the server keeps serving.
const test = require("node:test");
const assert = require("node:assert");
const { startServer, client, once, createGame } = require("./helpers");

test("a malformed event leaves the server serving", async () => {
  const server = await startServer();
  try {
    const A = await client(server);
    A.emit("move"); // sync listener: throws on the missing payload
    A.emit("getGame"); // async listener: rejects on the missing payload
    A.emit("changeName", null);
    A.emit("joinGame", null);
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
    assert.ok(!server.output.includes("Unhandled rejection"), server.output);
    assert.ok(!server.output.includes("Uncaught exception"), server.output);
  } finally {
    await server.stop();
  }
});
