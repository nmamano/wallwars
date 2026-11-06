// A failure before the server listens stops the process (Docker then restarts
// it): the last-resort error handlers must not keep a server with no listener.
const test = require("node:test");
const assert = require("node:assert");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

// 15 s, not less: the files run in parallel, and on a busy box the start is slow.
test("the process exits when its port is taken", async () => {
  const blocker = net.createServer();
  await new Promise((resolve) => blocker.listen(0, "0.0.0.0", resolve));
  const { port } = blocker.address();
  const child = spawn(process.execPath, ["--require", "./test/fake-db.js", "dist/app.js"], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PORT: String(port), APP_SOCKET: "", LOG_MESSAGES: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  try {
    const code = await new Promise((resolve) => {
      const t = setTimeout(() => resolve("still running"), 15000);
      child.on("exit", (c) => {
        clearTimeout(t);
        resolve(c);
      });
    });
    assert.notStrictEqual(code, "still running", output);
    assert.notStrictEqual(code, 0, output);
    assert.ok(output.includes("EADDRINUSE"), output);
  } finally {
    child.kill();
    blocker.close();
  }
});
