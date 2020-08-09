import React, { useEffect } from "react";

import globalSettings from "../shared/globalSettings";
import { useImmer } from "use-immer";
import Board from "../game/Board";
import { cellTypeByPos, emptyGrid } from "../gameLogic/mainLogic";

const GameShowcase = ({ socket, isLargeScreen, isDarkModeOn }) => {
  const [state, updateState] = useImmer({
    game: null,
    nextMove: 0,
    grid: emptyGrid(globalSettings.boardDims),
    playerPos: globalSettings.initialPlayerPos,
    needToRequestGame: true,
    // when a game stops playing, animation will wait 3 cycles to start a new game
    finishedGameWait: 3,
  });

  //timer interval to play a move every 3 seconds
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
        console.log("Error: game does not have a move history");
        return;
      }
      //finished playing game, request a new one
      if (state.nextMove === state.game.moveHistory.length) {
        updateState((draftState) => {
          if (draftState.finishedGameWait > 0) draftState.finishedGameWait--;
          else {
            draftState.game = null;
            draftState.needToRequestGame = true;
            draftState.finishedGameWait = 3;
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

        const creatorToMove =
          draftState.nextMove % 2 === (draftState.game.creatorStarts ? 0 : 1);
        const idxToMove = creatorToMove ? 0 : 1;
        const actions =
          draftState.game.moveHistory[draftState.nextMove].actions;
        for (let k = 0; k < actions.length; k++) {
          const pos = actions[k];
          if (cellTypeByPos(pos) === "Ground") {
            draftState.playerPos[idxToMove] = pos;
          } else {
            draftState.grid[pos.r][pos.c] = idxToMove + 1;
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
        draftState.nextMove = 0;
        draftState.grid = emptyGrid(globalSettings.boardDims);
        draftState.playerPos = globalSettings.initialPlayerPos;
      });
    });
  }, [socket, updateState, state.needToRequestGame]);

  return (
    <Board
      creatorToMove={false}
      playerColors={globalSettings.playerColors}
      grid={state.grid}
      playerPos={state.playerPos}
      goals={globalSettings.goals}
      ghostAction={null}
      premoveActions={[]}
      handleClick={null}
      groundSize={
        isLargeScreen
          ? globalSettings.groundSize
          : globalSettings.smallScreenGroundSize
      }
      wallWidth={
        isLargeScreen
          ? globalSettings.wallWidth
          : globalSettings.smallScreenWallWidth
      }
      isDarkModeOn={isDarkModeOn}
    />
  );
};

export default GameShowcase;
