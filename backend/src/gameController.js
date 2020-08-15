const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/*Game controller interacts with mongodb
Currently, 'games' is the only collection, so all the db logic is here

users can play even if the DB is down.
the games are simply not stored in that case */

var connectedToDB = false;

//shut deprecation warnings
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vt6ui.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
mongoose
  .connect(url)
  .then(() => {
    connectedToDB = true;
    console.log("mongoose connected to database");
  })
  .catch((err) => {
    connectedToDB = false;
    console.log("mongoose connection failed");
    console.log(err);
  });

const gameSchema = new Schema(
  {
    socketIds: {
      type: [String],
      required: true,
      validate: [(ids) => ids.length === 2, "socketIds should have 2 entries"],
    },
    joinCode: { type: String, required: true },
    timeControl: {
      duration: { type: Number, required: true },
      increment: { type: Number, required: true },
    },
    playerNames: {
      type: [String],
      required: true,
      validate: [
        (names) => names.length === 2,
        "playerNames should have 2 entries",
      ],
    },
    cookieIds: {
      type: [String],
      required: true,
      validate: [(ids) => ids.length === 2, "cookieIds should have 2 entries"],
    },
    playerTokens: {
      type: [String],
      required: true,
      validate: [
        (tokens) => tokens.length === 2,
        "playerTokens should have 2 entries",
      ],
    },
    gameWins: {
      type: [Number],
      required: true,
      validate: [(wins) => wins.length === 2, "gameWins should have 2 entries"],
    },
    winner: {
      type: String,
      required: true,
      validate: [
        (val) => val === "draw" || val === "creator" || val === "joiner",
        "winner should be 'draw', 'creator', or 'joiner'",
      ],
    },
    finishReason: {
      type: String,
      required: true,
      validate: [
        (reason) =>
          reason === "goal" ||
          reason === "agreement" ||
          reason === "time" ||
          reason === "resign" ||
          reason === "disconnect" ||
          reason === "abandon",
        (reason) =>
          `finishReason ${reason} should be 'goal', 'agreement', 'time', 'resign', or 'abandon'`,
      ],
    },
    creatorStarts: { type: Boolean, required: true },
    moveHistory: [
      {
        actions: {
          type: [
            {
              r: { type: Number, required: true },
              c: { type: Number, required: true },
            },
          ],
          required: true,
          validate: [
            (acts) => acts.length === 1 || acts.length === 2,
            "actions should contain 1 or 2 actions",
          ],
        },
        remainingTime: { type: Number, required: true },
        timestamp: { type: String, required: true },
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
  },
  { versionKey: false }
);
const Game = mongoose.model("Game", gameSchema);

const storeGame = async (game) => {
  if (!connectedToDB) return;
  if (game.moveHistory.length < 2) return;
  const gameToStore = new Game(game);
  try {
    await gameToStore.save();
    console.log(
      `Stored game in DB ${process.env.DB_NAME} _id: ${gameToStore.id} time: ${gameToStore.startDate}`
    );
  } catch (err) {
    console.log(`Store game to DB ${process.env.DB_NAME} failed`);
    console.log(err);
  }
};

const getGame = async (id) => {
  if (!connectedToDB) return null;
  let res = await Game.findById(id);
  return res;
};

const getRandomGame = async () => {
  if (!connectedToDB) return null;
  const conditions = {
    "moveHistory.20": { $exists: true }, //only games with 20+ moves
  };
  let count = await Game.countDocuments(conditions);
  const randomIndex = Math.floor(Math.random() * count);
  let res = await Game.findOne(conditions).skip(randomIndex);
  return res;
};

const getRecentGames = async () => {
  if (!connectedToDB) return null;
  const conditions = {
    "moveHistory.4": { $exists: true }, //only games with 4+ moves
  };
  //up to 100 games
  const games = await Game.find(conditions).sort({ startDate: 1 }).limit(100);
  games.reverse();
  return games;
};

exports.storeGame = storeGame;
exports.getGame = getGame;
exports.getRandomGame = getRandomGame;
exports.getRecentGames = getRecentGames;
