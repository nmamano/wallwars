import { GameState } from "./gameState";

// The game statistics of a player that a finished game changes.
export type PlayerStats = {
  gameCount: number;
  winCount: number;
  drawCount: number;
  firstGameDate: Date | null;
  lastGameDate: Date | null;
};

// Records the result of a game in the player's statistics. Rated play is off:
// the result comes from the clients, so it never changes a rating. The stored
// ratings stay as they were.
export function recordGameResult(
  player: PlayerStats,
  game: GameState,
  score: number
): void {
  player.gameCount++;
  if (score === 1) player.winCount++;
  if (score === 0.5) player.drawCount++;
  if (!player.firstGameDate) player.firstGameDate = game.startDate;
  player.lastGameDate = game.startDate;
}
