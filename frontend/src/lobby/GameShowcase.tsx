import { useEffect } from "react";
import { useImmer } from "use-immer";
import Board from "../game/Board";
import { cellSizes, defaultBoardSettings } from "../shared/globalSettings";
import {
  CellType,
  cellTypeByPos,
  emptyGrid,
  Grid,
  Pos,
} from "../shared/gameLogicUtils";
import { ServerGame } from "../game/gameState";
import { BoardThemeName, MenuThemeName } from "../shared/colorThemes";

type GameShowcaseState = {
  needToRequestGame: boolean;
  // When a game stops playing, animation will wait 3 cycles to start a new game.
  finishedGameWait: number;
  game: ServerGame | null;
  nextMove: number;
  grid: Grid;
  playerPos: [Pos, Pos];
  prevPos: [Pos | null, Pos | null];
};

export default function GameShowcase({
  socket,
  isLargeScreen,
  menuTheme,
  boardTheme,
  isDarkModeOn,
  handleViewGame,
}: {
  socket: any;
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  boardTheme: BoardThemeName;
  isDarkModeOn: boolean;
  handleViewGame: (gameId: string) => void;
}): JSX.Element {
  const [state, updateState] = useImmer<GameShowcaseState>({
    needToRequestGame: true,
    finishedGameWait: 3,
    game: null,
    nextMove: 0,
    grid: emptyGrid(defaultBoardSettings.dims),
    playerPos: defaultBoardSettings.startPos,
    prevPos: [null, null],
  });

  // Timer interval to play a move every 2 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      // Ask server for games.
      if (state.needToRequestGame) {
        updateState((draftState) => {
          draftState.needToRequestGame = false;
        });
        socket.emit("getRandomGame");
        return;
      }
      if (!state.game) return; // Already asked for game, but don't have it yet.
      if (!state.game.moveHistory) {
        console.error("game does not have a move history");
        return;
      }
      // Finished playing game, request a new one.
      if (state.nextMove === state.game.moveHistory.length) {
        updateState((draftState) => {
          if (draftState.finishedGameWait > 0) draftState.finishedGameWait--;
          else {
            draftState.needToRequestGame = true;
            draftState.finishedGameWait = 3;
          }
        });
        return;
      }
      // Play one move.
      updateState((draftState) => {
        if (
          !draftState.game ||
          !draftState.game.moveHistory ||
          draftState.nextMove === draftState.game.moveHistory.length
        )
          return;

        const idxToMove = creatorToMove(draftState) ? 0 : 1;
        const actions =
          draftState.game.moveHistory[draftState.nextMove].actions;
        for (let k = 0; k < actions.length; k++) {
          const pos = actions[k];
          if (cellTypeByPos(pos) === CellType.ground) {
            draftState.prevPos[idxToMove] = draftState.playerPos[idxToMove];
            draftState.playerPos[idxToMove] = pos;
          } else {
            draftState.grid[pos[0]][pos[1]] = (idxToMove + 1) as 1 | 2;
          }
        }
        draftState.nextMove++;
      });
    }, 200);
    return () => clearInterval(interval);
  });

  // Set up game received from server.
  useEffect(() => {
    socket.on("requestedRandomGame", ({ game }: { game: ServerGame }) => {
      updateState((draftState) => {
        draftState.game = game;
        draftState.grid = emptyGrid(game.boardSettings.dims);
        draftState.playerPos = game.boardSettings.startPos;
        draftState.prevPos = [null, null];
        draftState.nextMove = 0;
      });
    });

    return () => {
      socket.off("requestedRandomGame");
    };
  }, [socket, updateState, state.needToRequestGame]);

  const groundSize = isLargeScreen
    ? cellSizes.groundSize
    : cellSizes.smallScreenGroundSize;
  const wallWidth = isLargeScreen
    ? cellSizes.wallWidth
    : cellSizes.smallScreenWallWidth;

  let lastActions: Pos[] = [];
  if (state.nextMove > 0)
    lastActions = state.game!.moveHistory[state.nextMove - 1].actions;

  const cToMove = state.game && creatorToMove(state);
  let tracePos = null;
  if (
    lastActions.length === 1 ||
    (lastActions.length === 2 &&
      (cellTypeByPos(lastActions[0]) === CellType.ground ||
        cellTypeByPos(lastActions[1]) === CellType.ground))
  )
    tracePos = cToMove ? state.prevPos[1] : state.prevPos[0];

  return (
    <Board
      grid={state.grid}
      playerPos={state.playerPos}
      goals={
        state.game
          ? state.game.boardSettings.goalPos
          : defaultBoardSettings.goalPos
      }
      ghostAction={null}
      creatorToMove={cToMove}
      premoveActions={[]}
      lastActions={lastActions}
      tracePos={tracePos}
      handleClick={() => {
        if (state.game) handleViewGame(state.game._id);
      }}
      groundSize={groundSize}
      wallWidth={wallWidth}
      menuTheme={menuTheme}
      boardTheme={boardTheme}
      isDarkModeOn={isDarkModeOn}
      tokens={state.game ? state.game.playerTokens : ["default", "default"]}
    />
  );
}

function creatorToMove(state: GameShowcaseState): boolean {
  return state.nextMove % 2 === (state.game!.creatorStarts ? 0 : 1);
}
