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
  nameExists: async () => false,
  changeName: async () => true,
  getRanking: async () => [],
  addPlayerSolvedPuzzle: async () => true,
  storeGameAndUpdatePlayers: async () => true,
  getGame: async () => null,
  getRandomGame: async () => null,
  getRecentGameSummaries: async () => [],
};

const file = path.join(__dirname, "..", "dist", "src", "database.js");
require.cache[file] = { id: file, filename: file, loaded: true, exports: fakeDb };
