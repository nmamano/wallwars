import React, { useEffect } from "react";
import { useImmer } from "use-immer";

import Board from "../game/Board";
import { cellSizes, defaultBoardSettings } from "../shared/globalSettings";
import { cellEnum, cellTypeByPos, emptyGrid } from "../shared/gameLogicUtils";

//not the same state as in GamePage. This is based on the server's game representation
const creatorToMove = (state) =>
  state.nextMove % 2 === (state.game.creatorStarts ? 0 : 1);

const GameShowcase = ({
  socket,
  isLargeScreen,
  menuTheme,
  boardTheme,
  isDarkModeOn,
  handleViewGame,
}) => {
  const [state, updateState] = useImmer({
    needToRequestGame: true,
    // when a game stops playing, animation will wait 3 cycles to start a new game
    finishedGameWait: 3,
    game: null, //game from server
    nextMove: 0,
    grid: emptyGrid(defaultBoardSettings.dims),
    playerPos: defaultBoardSettings.startPos,
    prevPos: [null, null],
  });

  //timer interval to play a move every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      //ask server for games
      if (state.needToRequestGame) {
        updateState((draftState) => {
          draftState.needToRequestGame = false;
        });
        socket.emit("getRandomGame");
        return;
      }
      if (!state.game) return; //already asked for game, but don't have it yet
      if (!state.game.moveHistory) {
        console.error("game does not have a move history");
        return;
      }
      //finished playing game, request a new one
      if (state.nextMove === state.game.moveHistory.length) {
        updateState((draftState) => {
          if (draftState.finishedGameWait > 0) draftState.finishedGameWait--;
          else {
            draftState.needToRequestGame = true;
            draftState.finishedGameWait = 3;
            draftState.game = null;
            draftState.nextMove = 0;
            draftState.grid = emptyGrid(defaultBoardSettings.dims);
            draftState.playerPos = defaultBoardSettings.startPos;
            draftState.prevPos = [null, null];
          }
        });
        return;
      }
      //play one move
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
          if (cellTypeByPos(pos) === cellEnum.groud) {
            draftState.prevPos[idxToMove] = draftState.playerPos[idxToMove];
            draftState.playerPos[idxToMove] = pos;
          } else {
            draftState.grid[pos[0]][pos[1]] = idxToMove + 1;
          }
        }
        draftState.nextMove++;
      });
    }, 2000);
    return () => clearInterval(interval);
  });

  //setup game received from server
  useEffect(() => {
    socket.on("requestedRandomGame", ({ game }) => {
      updateState((draftState) => {
        draftState.game = game;
        draftState.grid = emptyGrid(game.boardSettings.dims);
        draftState.playerPos = game.boardSettings.startPos;
      });
    });

    return () => {
      socket.off("requestedRandomGame");
    };
  }, [socket, updateState, state.needToRequestGame]);

  let lastActions = [];
  if (state.nextMove > 0)
    lastActions = state.game.moveHistory[state.nextMove - 1].actions;

  const groundSize = isLargeScreen
    ? cellSizes.groundSize
    : cellSizes.smallScreenGroundSize;
  const wallWidth = isLargeScreen
    ? cellSizes.wallWidth
    : cellSizes.smallScreenWallWidth;

  const cToMove = state.game && creatorToMove(state);
  let tracePos = null;
  if (
    lastActions.length === 1 ||
    (lastActions.length === 2 &&
      (cellTypeByPos(lastActions[0]) === cellEnum.ground ||
        cellTypeByPos(lastActions[1]) === cellEnum.ground))
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
};

export default GameShowcase;
