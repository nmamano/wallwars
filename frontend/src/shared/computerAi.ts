import { GameState } from "../game/gameState";
import { Pos, Move } from "./gameLogicUtils";
import {
  distance,
  dimensions,
  inBounds,
  getStandardNotation,
  MoveNotationToMove,
} from "./gameLogicUtils";

export async function getAiMove(
  state: GameState,
  wasmAIGetMove?: (s: string) => string
): Promise<Move> {
  if (!wasmAIGetMove) {
    console.log("Fall back in case the WebAssembly AI hasn't loaded yet");
    return DoubleWalkMove(state);
  }
  const standard_notation = getStandardNotation(state.moveHistory);
  const move_notation = wasmAIGetMove(standard_notation);
  return MoveNotationToMove(move_notation);
}

// Simple AI that walks towards the goal. It does not build any walls.
function DoubleWalkMove(state: GameState): Move {
  const grid = state.moveHistory[state.moveHistory.length - 1].grid;
  const playerPos = state.moveHistory[state.moveHistory.length - 1].playerPos;
  const aiPos = playerPos[1];
  const aiGoal = state.boardSettings.goalPos[1];
  const curDist = distance(grid, aiPos, aiGoal);
  const dist2offsets = [
    [0, 2],
    [1, 1],
    [2, 0],
    [1, -1],
    [0, -2],
    [-1, -1],
    [-2, 0],
    [-1, 1],
  ];
  for (let k = 0; k < 8; k++) {
    const [or, oc] = [dist2offsets[k][0], dist2offsets[k][1]];
    const candidatePos: Pos = [aiPos[0] + 2 * or, aiPos[1] + 2 * oc];
    if (
      inBounds(candidatePos, dimensions(grid)) &&
      distance(grid, aiPos, candidatePos) === 2 &&
      distance(grid, candidatePos, aiGoal) === curDist - 2
    ) {
      return [candidatePos];
    }
  }
  // If there is no cell at distance 2 which is 2 steps closer to the goal,
  // it means that the AI is at distance 1 from its goal. In this case, we simply
  // move to the goal. Note that it is not a legal move, as it is only 1 action.
  return [aiGoal];
}
