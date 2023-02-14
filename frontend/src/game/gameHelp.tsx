import React from "react";

const gameHelp: JSX.Element = (
  <div>
    <h6>
      To connect with your friend, share the game code in the top header with
      them and tell them to use it when clicking "Join Game" from the lobby.
      Click on the code to copy it to the clipboard.
    </h6>
    <h6>Rules of the game:</h6>
    <h6>
      The player who creates the game starts at the top left corner (color red).
      The player who joins the game starts at the top right (color blue). The
      goal of each player is to reach the <em>opposite</em> corner from where
      they start. The player who gets there first wins.
    </h6>
    <h6>
      Players move by clicking cells on the board. There are two types of cells:
      ground cells (the big squares) and walls (the thin rectangles between
      ground cells). Each move consists of a total of two actions. One action
      can be building one wall or moving to an adjacent cell. A diagonal move
      counts as two actions.
    </h6>
    <h6>
      Players can build walls to obstruct the opponent. Walls can be built
      anywhere as long as there always exists at least one way to get to their
      goal. You cannot go through your own walls either.
    </h6>
    <h6>
      The remaining time for each player is shown next to their name. The clock
      of a player ticks down when it is their turn (after each player has moved
      once). The player who starts is chosen randomly. The name of the player to
      move next is highlighted with their color.
    </h6>
    <h6>
      If it is your turn and you do a single action, like building a wall or
      moving to an adjacent cell, you can undo it by clicking the wall again or
      clicking a different ground cell, respectively. Once you choose 2 actions,
      the move becomes permanent.
    </h6>
    <h6>
      During the opponent's turn, you can <em>premove</em>, meaning choose a
      move that will be applied instantaneously when it is your turn.
    </h6>
    <h6>
      Starter handicap rule: If the player who moved first reaches the goal
      first but the other player is at distance 1 or 2 from their goal, the game
      ends in a draw.
    </h6>
    <h6>
      If you leave the game, you will be able to reenter this game as long as
      you don't create or join a new game.
    </h6>
  </div>
);

export default gameHelp;
