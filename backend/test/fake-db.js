// Preloaded (node --require) by the tests: puts an in-memory database in place
// of dist/src/database.js, so the server runs without MongoDB.
const path = require("path");

const players = new Map();
const fakeDb = {
  __esModule: true,
  getPlayer: async (idToken) => (idToken ? players.get(idToken) || null : null),
  addNewPlayer: async (idToken, name, creationDate) => {
    players.set(idToken, { idToken, name, rating: 1500, solvedPuzzles: [], creationDate });
    return true;
  },
  getName: async (idToken) => players.get(idToken)?.name ?? null,
  // FAKE_DB_NAMES_TAKEN=letters: every name with no digit is taken (the pool
  // of random names is full). FAKE_DB_NAMES_TAKEN=all: every name is taken.
  nameExists: async (name) =>
    process.env.FAKE_DB_NAMES_TAKEN === "all" ||
    (process.env.FAKE_DB_NAMES_TAKEN === "letters" && !/\d/.test(name)) ||
    [...players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase()),
  changeName: async () => true,
  getRanking: async () => [],
  addPlayerSolvedPuzzle: async () => true,
  storeGame: async (game) => {
    // The tests read this line from the server output.
    console.log(`FAKE_DB stored game isRated=${game.isRated} winner=${game.winner}`);
    return true;
  },
  getGame: async () => null,
  getRandomGame: async () => null,
  getRecentGameSummaries: async () => [],
};

const file = path.join(__dirname, "..", "dist", "src", "database.js");
require.cache[file] = { id: file, filename: file, loaded: true, exports: fakeDb };
