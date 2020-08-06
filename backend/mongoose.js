const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//users can play regardless of whether the connection to the DB is down
//the games are simply not stored in that case
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
    gameId: { type: String, required: true },
    gameWins: {
      type: [Number],
      required: true,
      validate: [(wins) => wins.length === 2, "gameWins should have 2 entries"],
    },
    socketIds: {
      type: [String],
      required: true,
      validate: [(ids) => ids.length === 2, "socketIds should have 2 entries"],
    },
    playerNames: {
      type: [String],
      required: true,
      validate: [
        (names) => names.length === 2,
        "playerNames should have 2 entries",
      ],
    },
    timeControl: {
      duration: { type: Number, required: true },
      increment: { type: Number, required: true },
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
      },
    ],
    winner: {
      type: String,
      required: true,
      validate: [
        (val) => val === "draw" || val === "creator" || val === "joiner",
        "winner should be 'draw', 'creator', or 'joiner'",
      ],
    },
    finnishReason: {
      type: String,
      required: true,
      validate: [
        (reason) =>
          reason === "goal" ||
          reason === "agreement" ||
          reason === "time" ||
          reason === "resign" ||
          reason === "disconnect",
        "finnishReason should be 'goal', 'agreement', 'time', 'resign', or 'disconnect'",
      ],
    },
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
  const gameToStore = new Game(game);
  try {
    await gameToStore.save();
    console.log(
      `Stored game in DB ${process.env.DB_NAME} _id: ${gameToStore.id}`
    );
  } catch (err) {
    console.log(`Store game to DB ${process.env.DB_NAME} failed`);
    console.log(err);
  }
};

const getAllGames = async () => {
  if (!connectedToDB) return [];
  const games = Game.find();
  return games;
};

exports.storeGame = storeGame;
exports.getAllGames = getAllGames;
