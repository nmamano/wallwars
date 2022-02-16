/*Game controller encapsulates the interaction with mongodb
users can play even if the DB is down: the games are simply not stored in that case */
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { updateRating, initialRating } = require("./rating/rating");

//shut deprecation warnings
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vt6ui.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
var connectedToDB = false;

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

const pseudoPlayerSchema = new Schema({
  eloId: { type: String, required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  peakRating: { type: Number, required: true },
  ratingDeviation: { type: Number, required: true },
  ratingVolatility: { type: Number, required: true },
  gameCount: { type: Number, required: true },
  winCount: { type: Number, required: true },
  drawCount: { type: Number, required: true },
  firstGameDate: { type: Date, required: true },
  lastGameDate: { type: Date, required: true },
  solvedPuzzles: { type: [String], required: true },
});

const PseudoPlayer = mongoose.model("PseudoPlayer", pseudoPlayerSchema);

const getPseudoPlayer = async (eloId) => {
  if (!connectedToDB) return null;
  return await PseudoPlayer.findOne({ eloId: eloId });
};

const getRanking = async (count) => {
  if (!connectedToDB) return null;
  if (count < 1) return null;
  //up to count pseudoplayers
  const pseudoPlayers = await PseudoPlayer.find()
    .sort({ rating: -1 })
    .limit(count);
  // We don't need to send the eloIds to the client viewing the ranking
  pseudoPlayers.forEach((p) => {
    delete p.eloId;
  });
  return pseudoPlayers;
};

// Does not insert the player in the database, it just initializes some of the fields.
const createNewPseudoPlayer = (eloId) => {
  const r = initialRating();
  return {
    eloId: eloId,
    name: "",
    rating: r.rating,
    peakRating: r.rating,
    ratingDeviation: r.deviation,
    ratingVolatility: r.volatility,
    gameCount: 0,
    winCount: 0,
    drawCount: 0,
    firstGameDate: null,
    lastGameDate: null,
    solvedPuzzles: [],
  };
};

// updates the `pseudoPlayer` object (locally) based on the result of a game
const updatePseudoPlayer = (pseudoPlayer, game, score, newRating) => {
  const eloId = pseudoPlayer.eloId;
  if (eloId !== game.eloIds[0] && eloId !== game.eloIds[1])
    console.error("player is not in this game");
  const pIndex = pseudoPlayer.eloId === game.eloIds[0] ? 0 : 1;
  pseudoPlayer.name = game.playerNames[pIndex];
  pseudoPlayer.rating = newRating.rating;
  pseudoPlayer.peakRating = Math.max(
    pseudoPlayer.rating,
    pseudoPlayer.peakRating
  );
  pseudoPlayer.ratingDeviation = newRating.deviation;
  pseudoPlayer.ratingVolatility = newRating.volatility;
  pseudoPlayer.gameCount++;
  if (score === 1) pseudoPlayer.winCount++;
  if (score === 0.5) pseudoPlayer.drawCount++;
  if (!pseudoPlayer.firstGameDate) pseudoPlayer.firstGameDate = game.startDate;
  pseudoPlayer.lastGameDate = game.startDate;
};

// Adds a puzzle to the list of the players' solved puzzles, if it is not
// already marked as solved.
const addPseudoPlayerSolvedPuzzle = async (eloId, name, puzzleId) => {
  if (!connectedToDB) return;
  let p = await PseudoPlayer.findOne({ eloId: eloId });
  if (!p) {
    const timestamp = Date.now();
    console.log("creating new pseudoPlayer");
    p = new PseudoPlayer(createNewPseudoPlayer(eloId));
    p.name = name;
    p.firstGameDate = timestamp;
    p.lastGameDate = timestamp;
  }
  if (p.solvedPuzzles.includes(puzzleId)) return;
  p.solvedPuzzles.push(puzzleId);
  try {
    await p.save();
    console.log(
      `Stored pseudoplayer in DB ${process.env.DB_NAME}: name ${p.name} eloId ${p.eloId}`
    );
  } catch (err) {
    console.error(
      `Store pseudoplayer ${p} to DB ${process.env.DB_NAME} failed`
    );
    console.log(err);
  }
};

// updates both pseudoplayers of a game in the database. If a pseudoplayer is not yet
// in the database, a new one is created
const updatePseudoPlayers = async (game) => {
  if (!connectedToDB) return;
  // Read the two players from db, or create new ones if not found
  let p1 = await PseudoPlayer.findOne({ eloId: game.eloIds[0] });
  if (!p1) {
    console.log("creating new pseudoPlayer for creator");
    p1 = new PseudoPlayer(createNewPseudoPlayer(game.eloIds[0]));
  }
  let p2 = await PseudoPlayer.findOne({ eloId: game.eloIds[1] });
  if (!p2) {
    console.log("creating new pseudoPlayer for joiner");
    p2 = new PseudoPlayer(createNewPseudoPlayer(game.eloIds[1]));
  }
  // Update the fields based on the result of the game
  let scores;
  if (game.winner === "draw") scores = [0.5, 0.5];
  else if (game.winner === "creator") scores = [1, 0];
  else scores = [0, 1];
  const p1NewRating = updateRating(p1, p2, scores[0]);
  const p2NewRating = updateRating(p2, p1, scores[1]);
  updatePseudoPlayer(p1, game, scores[0], p1NewRating);
  updatePseudoPlayer(p2, game, scores[1], p2NewRating);
  // Store the players with the updated fields
  try {
    await p1.save();
    console.log(
      `Stored pseudoplayer in DB ${process.env.DB_NAME}: name ${p1.name} eloId ${p1.eloId} freshness: ${p1.lastGameDate}`
    );
  } catch (err) {
    console.error(`Store pseudoplayer to DB ${process.env.DB_NAME} failed`);
    console.log(err);
  }
  try {
    await p2.save();
    console.log(
      `Stored pseudoplayer in DB ${process.env.DB_NAME}: name ${p2.name} eloId ${p2.eloId} freshness: ${p2.lastGameDate}`
    );
  } catch (err) {
    console.error(`Store pseudoplayer to DB ${process.env.DB_NAME} failed`);
    console.log(err);
  }
};

const moveSchema = new Schema(
  {
    actions: {
      type: [[Number]],
      required: true,
      validate: [
        (acts) => acts.length === 1 || acts.length === 2,
        "actions should contain 1 or 2 actions",
      ],
    },
    remainingTime: { type: Number, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false }
);

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
    boardSettings: {
      dims: {
        type: [Number],
        required: true,
        validate: [
          (dimensions) => dimensions.length === 2,
          "dims should have 2 entries",
        ],
      },
      startPos: {
        type: [[Number]],
        required: true,
        validate: [
          (sp) => sp.length === 2 && sp[0].length === 2 && sp[1].length === 2,
          "there should be 2 startPos of size 2",
        ],
      },
      goalPos: {
        type: [[Number]],
        required: true,
        validate: [
          (gp) => gp.length === 2 && gp[0].length === 2 && gp[1].length === 2,
          "there should be 2 goalPos of size 2",
        ],
      },
    },
    playerNames: {
      type: [String],
      required: true,
      validate: [
        (names) => names.length === 2,
        "playerNames should have 2 entries",
      ],
    },
    eloIds: {
      type: [String],
      required: true,
      validate: [(ids) => ids.length === 2, "eloIds should have 2 entries"],
    },
    playerTokens: {
      type: [String],
      required: true,
      validate: [
        (tokens) => tokens.length === 2,
        "playerTokens should have 2 entries",
      ],
    },
    matchScore: {
      type: [Number],
      required: true,
      validate: [
        (wins) => wins.length === 2,
        "matchScore should have 2 entries",
      ],
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
          reason === "abandon",
        (reason) =>
          `finishReason ${reason} should be 'goal', 'agreement', 'time', 'resign', or 'abandon'`,
      ],
    },
    creatorStarts: { type: Boolean, required: true },
    moveHistory: [moveSchema],
    startDate: {
      type: Date,
      required: true,
    },
    isPublic: { type: Boolean, required: true },
    numSpectators: { type: Number, required: true },
    numMoves: { type: Number, required: true },
    finalDists: {
      type: [Number],
      required: true,
      validate: [
        (dists) => dists.length === 2 && dists[0] >= 0 && dists[1] >= 0,
        "there should be 2 non-negative distances",
      ],
    },
    version: { type: String, required: true },
    ratings: {
      type: [Number],
      required: true,
      validate: [
        (ratings) => ratings.length === 2,
        "ratings should have 2 entries",
      ],
    },
  },
  { versionKey: false }
);
const Game = mongoose.model("Game", gameSchema);

// Stores the game to DB and updates the two pseudoplayers in the DB.
const storeGame = async (game) => {
  if (!connectedToDB) return;
  if (game.moveHistory.length < 2) return;
  const gameToStore = new Game(game);
  try {
    await gameToStore.save();
    console.log(
      `Stored game in DB ${process.env.DB_NAME} _id: ${gameToStore.id} time: ${gameToStore.startDate}`
    );
    try {
      await updatePseudoPlayers(game);
      console.log(`Updated pseudo players`);
    } catch (err) {
      console.error("Updating pseudo players failed");
      console.log(err);
    }
  } catch (err) {
    console.error(`Store game to DB ${process.env.DB_NAME} failed`);
    console.log(err);
  }
};

// Gets game from db and removes ELO ids before returning it.
const getGame = async (id) => {
  if (!connectedToDB) return null;
  let game = await Game.findById(id);
  if (!game) return null;
  let gameWithoutEloIds = JSON.parse(JSON.stringify(game));
  delete gameWithoutEloIds.eloIds;
  return gameWithoutEloIds;
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

// Gets some metadata from each game, without getting the full list of moves.
const getRecentGameSummaries = async (count) => {
  if (!connectedToDB) return null;
  if (count < 1) return null;
  const conditions = {
    "moveHistory.4": { $exists: true }, //only games with 4+ moves
  };
  const gameSummaries = await Game.find(
    conditions,
    "_id playerNames timeControl winner startDate ratings numMoves"
  )
    .sort({ startDate: -1 })
    .limit(count); //up to count games
  return gameSummaries;
};

exports.storeGame = storeGame;
exports.getGame = getGame;
exports.getPseudoPlayer = getPseudoPlayer;
exports.getRanking = getRanking;
exports.getRandomGame = getRandomGame;
exports.getRecentGameSummaries = getRecentGameSummaries;
exports.createNewPseudoPlayer = createNewPseudoPlayer;
exports.addPseudoPlayerSolvedPuzzle = addPseudoPlayerSolvedPuzzle;
