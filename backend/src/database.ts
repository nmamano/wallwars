/* Database controller encapsulates the interaction with mongodb.
Users can play even if the DB is down: the games are simply not stored in that case */
import mongoose from "mongoose";
const Schema = mongoose.Schema;
import { updateRating, initialRating } from "./rating";
import { GameState } from "./gameState";

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

// ============================================
// Types representing the interface with the database.
// ============================================

export type dbPseudoPlayer = {
  eloId: string;
  name: string;
  rating: number;
  peakRating: number;
  ratingDeviation: number;
  ratingVolatility: number;
  gameCount: number;
  winCount: number;
  drawCount: number;
  firstGameDate: Date | null; // null indicates that the player has not played any game yet.
  lastGameDate: Date | null; // null indicates that the player has not played any game yet.
  solvedPuzzles: string[];
};

export type dbPlayerWithoutEloId = Omit<dbPseudoPlayer, "eloId">;

// We should not send the eloIds to the client viewing the ranking.
export type dbRanking = dbPlayerWithoutEloId[];

// An action is represented by the row and column clicked in the grid cell (includes walkable cells,
// walls, and pillars).
export type dbAction = [number, number];

export type dbMove = {
  actions: dbAction[];
  remainingTime: number;
  timestamp: string;
};

export type dbPos = [number, number];

export type dbBoardSettings = {
  dims: [number, number];
  startPos: [dbPos, dbPos];
  goalPos: [dbPos, dbPos];
};

export type dbTimeControl = {
  duration: number;
  increment: number;
};

export type dbWinner = "creator" | "joiner" | "draw";

export type dbFinishReason =
  | "goal"
  | "agreement"
  | "time"
  | "resign"
  | "abandon";

export type dbFinishedGame = {
  socketIds: [string, string];
  joinCode: string;
  timeControl: dbTimeControl;
  boardSettings: dbBoardSettings;
  playerNames: [string, string];
  eloIds: [string, string];
  playerTokens: [string, string];
  matchScore: [number, number];
  winner: dbWinner;
  finishReason: dbFinishReason;
  creatorStarts: boolean;
  moveHistory: dbMove[];
  startDate: Date;
  isPublic: boolean;
  numSpectators: number;
  numMoves: number;
  finalDists: [number, number];
  version: string;
  ratings: [number, number];
};

export type dbGameSummary = {
  _id: string;
  playerNames: [string, string];
  timeControl: dbTimeControl;
  winner: dbWinner;
  startDate: Date;
  ratings: [number, number];
  numMoves: number;
};

export type dbFinishedGameWithoutEloId = Omit<dbFinishedGame, "eloIds">;

// ============================================
// Functions to interact with the database.
// ============================================

export async function getPseudoPlayer(
  eloId: string
): Promise<dbPseudoPlayer | null> {
  if (!connectedToDB) return null;
  return await PseudoPlayer.findOne({ eloId: eloId });
}

export async function getRanking(count: number): Promise<dbRanking | null> {
  if (!connectedToDB) return null;
  if (count < 1) return null;
  // Up to count pseudoplayers.
  const pseudoPlayers = await PseudoPlayer.find()
    .sort({ rating: -1 })
    .limit(count);
  const players: dbPlayerWithoutEloId[] = [];
  pseudoPlayers.forEach((p) => {
    players.push({
      name: p.name,
      rating: p.rating,
      peakRating: p.peakRating,
      ratingDeviation: p.ratingDeviation,
      ratingVolatility: p.ratingVolatility,
      gameCount: p.gameCount,
      winCount: p.winCount,
      drawCount: p.drawCount,
      firstGameDate: p.firstGameDate,
      lastGameDate: p.lastGameDate,
      solvedPuzzles: p.solvedPuzzles,
    });
  });
  return players;
}

// Does not insert the player in the database, it just initializes some of the fields.
export function createNewPseudoPlayer(eloId: string): dbPseudoPlayer {
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
}

// Adds a puzzle to the list of the players' solved puzzles, if it is not
// already marked as solved.
export async function addPseudoPlayerSolvedPuzzle(
  eloId: string,
  name: string,
  puzzleId: string
): Promise<void> {
  if (!connectedToDB) return;
  let p = await PseudoPlayer.findOne({ eloId: eloId });
  // If the pseudoplayer is not in the DB yet because they have not played any game yet, create it
  // so we can keep track of their puzzle completions.
  if (!p) {
    const timestamp = Date.now();
    console.log("creating new pseudoPlayer");
    p = new PseudoPlayer(createNewPseudoPlayer(eloId));
    p.name = name;
    p.firstGameDate = new Date(timestamp);
    p.lastGameDate = new Date(timestamp);
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
}

// Stores the game to DB and updates the two pseudoplayers in the DB.
export async function storeGame(game: GameState): Promise<void> {
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
}

// Gets game from db and removes ELO ids before returning it.
export async function getGame(
  id: string
): Promise<dbFinishedGameWithoutEloId | null> {
  if (!connectedToDB) return null;
  let game = await Game.findById(id);
  if (!game) return null;
  return gameModelToDBGame(game);
}

export async function getRandomGame(): Promise<dbFinishedGameWithoutEloId | null> {
  if (!connectedToDB) return null;
  const conditions = {
    "moveHistory.20": { $exists: true }, //only games with 20+ moves
  };
  let count = await Game.countDocuments(conditions);
  const randomIndex = Math.floor(Math.random() * count);
  let game = await Game.findOne(conditions).skip(randomIndex);
  if (!game) return null;
  return gameModelToDBGame(game);
}

// Gets some metadata from each game, without getting the full list of moves.
export async function getRecentGameSummaries(
  count: number
): Promise<dbGameSummary[] | null> {
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
  const res: dbGameSummary[] = [];
  gameSummaries.forEach((game) => {
    res.push({
      _id: game._id.toString(),
      playerNames: game.playerNames as [string, string],
      timeControl: game.timeControl as dbTimeControl,
      winner: game.winner as dbWinner,
      startDate: game.startDate,
      ratings: game.ratings as [number, number],
      numMoves: game.numMoves,
    });
  });
  return res;
}

// ============================================
// Database internals.
// ============================================

// The data returned by the database for a game.
type gameDocument = {
  winner: string;
  finishReason: string;
  timeControl?: {
    increment: number;
    duration: number;
  };
  boardSettings?: {
    dims: number[];
    startPos: number[][];
    goalPos: number[][];
  };
  isPublic: boolean;
  joinCode: string;
  playerNames: string[];
  playerTokens: string[];
  creatorStarts: boolean;
  eloIds: string[];
  socketIds: string[];
  matchScore: number[];
  moveHistory: mongoose.Types.DocumentArray<{
    actions: number[][];
    remainingTime: number;
    timestamp: string;
  }>;
  startDate: Date;
  numSpectators: number;
  numMoves: number;
  finalDists: number[];
  version: string;
  ratings: number[];
};

function gameModelToDBGame(game: gameDocument): dbFinishedGameWithoutEloId {
  let moveHistory: dbMove[] = [];
  for (let i = 0; i < game.moveHistory.length; i++) {
    let actions: dbAction[] = [];
    for (let j = 0; j < game.moveHistory[i].actions.length; j++) {
      actions.push(game.moveHistory[i].actions[j] as dbAction);
    }
    moveHistory.push({
      actions: actions,
      remainingTime: game.moveHistory[i].remainingTime,
      timestamp: game.moveHistory[i].timestamp,
    });
  }
  const boardSettings = game.boardSettings as dbBoardSettings;

  return {
    socketIds: game.socketIds as [string, string],
    joinCode: game.joinCode,
    timeControl: game.timeControl as dbTimeControl,
    boardSettings: {
      dims: boardSettings.dims as [number, number],
      startPos: boardSettings.startPos as [dbPos, dbPos],
      goalPos: boardSettings.goalPos as [dbPos, dbPos],
    },
    playerNames: game.playerNames as [string, string],
    playerTokens: game.playerTokens as [string, string],
    matchScore: game.matchScore as [number, number],
    winner: game.winner as dbWinner,
    finishReason: game.finishReason as dbFinishReason,
    creatorStarts: game.creatorStarts,
    moveHistory: moveHistory,
    startDate: game.startDate,
    isPublic: game.isPublic,
    numSpectators: game.numSpectators,
    numMoves: game.numMoves,
    finalDists: game.finalDists as [number, number],
    version: game.version,
    ratings: game.ratings as [number, number],
  };
}

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

// updates the `pseudoPlayer` object (locally) based on the result of a game
function updatePseudoPlayer(
  pseudoPlayer: dbPseudoPlayer,
  game: GameState,
  score: number,
  newRatingTuple: { rating: number; deviation: number; volatility: number }
) {
  const eloId = pseudoPlayer.eloId;
  if (eloId !== game.eloIds[0] && eloId !== game.eloIds[1])
    console.error("player is not in this game");
  const pIndex = pseudoPlayer.eloId === game.eloIds[0] ? 0 : 1;
  pseudoPlayer.name = game.playerNames[pIndex] || "";
  pseudoPlayer.rating = newRatingTuple.rating;
  pseudoPlayer.peakRating = Math.max(
    pseudoPlayer.rating,
    pseudoPlayer.peakRating
  );
  pseudoPlayer.ratingDeviation = newRatingTuple.deviation;
  pseudoPlayer.ratingVolatility = newRatingTuple.volatility;
  pseudoPlayer.gameCount++;
  if (score === 1) pseudoPlayer.winCount++;
  if (score === 0.5) pseudoPlayer.drawCount++;
  if (!pseudoPlayer.firstGameDate) pseudoPlayer.firstGameDate = game.startDate;
  pseudoPlayer.lastGameDate = game.startDate;
}

// updates both pseudoplayers of a game in the database. If a pseudoplayer is not yet
// in the database, a new one is created
async function updatePseudoPlayers(game: GameState): Promise<void> {
  if (!connectedToDB) return;
  if (!game.eloIds[0] || !game.eloIds[1]) {
    console.error(
      "cannot update pseudo players because game.eloIds is not set"
    );
    return;
  }

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
  const p1RatingTuple = {
    rating: p1.rating,
    deviation: p1.ratingDeviation,
    volatility: p1.ratingVolatility,
  };
  const p2RatingTuple = {
    rating: p2.rating,
    deviation: p2.ratingDeviation,
    volatility: p2.ratingVolatility,
  };
  const p1NewRating = updateRating(p1RatingTuple, p2RatingTuple, scores[0]);
  const p2NewRating = updateRating(p2RatingTuple, p1RatingTuple, scores[1]);
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
}

const moveSchema = new Schema(
  {
    actions: {
      type: [[Number]],
      required: true,
      validate: [
        (acts: number[]) => acts.length === 1 || acts.length === 2,
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
      validate: [
        (ids: [string, string]) => ids.length === 2,
        "socketIds should have 2 entries",
      ],
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
          (dimensions: [number, number]) => dimensions.length === 2,
          "dims should have 2 entries",
        ],
      },
      startPos: {
        type: [[Number]],
        required: true,
        validate: [
          (sp: [dbPos, dbPos]) =>
            sp.length === 2 && sp[0].length === 2 && sp[1].length === 2,
          "there should be 2 startPos of size 2",
        ],
      },
      goalPos: {
        type: [[Number]],
        required: true,
        validate: [
          (gp: [dbPos, dbPos]) =>
            gp.length === 2 && gp[0].length === 2 && gp[1].length === 2,
          "there should be 2 goalPos of size 2",
        ],
      },
    },
    playerNames: {
      type: [String],
      required: true,
      validate: [
        (names: [string, string]) => names.length === 2,
        "playerNames should have 2 entries",
      ],
    },
    eloIds: {
      type: [String],
      required: true,
      validate: [
        (ids: [string, string]) => ids.length === 2,
        "eloIds should have 2 entries",
      ],
    },
    playerTokens: {
      type: [String],
      required: true,
      validate: [
        (tokens: [string, string]) => tokens.length === 2,
        "playerTokens should have 2 entries",
      ],
    },
    matchScore: {
      type: [Number],
      required: true,
      validate: [
        (wins: [number, number]) => wins.length === 2,
        "matchScore should have 2 entries",
      ],
    },
    winner: {
      type: String,
      required: true,
      validate: [
        (val: dbWinner) =>
          val === "draw" || val === "creator" || val === "joiner",
        "winner should be 'draw', 'creator', or 'joiner'",
      ],
    },
    finishReason: {
      type: String,
      required: true,
      validate: [
        (reason: dbFinishReason) =>
          reason === "goal" ||
          reason === "agreement" ||
          reason === "time" ||
          reason === "resign" ||
          reason === "abandon",
        (reason: dbFinishReason) =>
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
        (dists: [number, number]) =>
          dists.length === 2 && dists[0] >= 0 && dists[1] >= 0,
        "there should be 2 non-negative distances",
      ],
    },
    version: { type: String, required: true },
    ratings: {
      type: [Number],
      required: true,
      validate: [
        (ratings: [number, number]) => ratings.length === 2,
        "ratings should have 2 entries",
      ],
    },
  },
  { versionKey: false }
);
const Game = mongoose.model("Game", gameSchema);
