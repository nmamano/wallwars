const gameHelp: JSX.Element = (
  <div>
    <h6>
      In puzzles, you are put in a specific situation and you have to find a
      winning move. A winning move is a move that guarantees winning no matter
      what the opponent does. If there are multiple winning moves, only the one
      that wins in the fewest turns is accepted. If there are multiple winning
      moves that win in the minimum number of steps, then any of them should be
      accepted. The puzzle ends when you have reached the goal.
    </h6>
    <h5>Rules of the game:</h5>
    <h6>
      The goal of each player is to reach their "goal" first, which is the
      square with a "shadow" with the same shape as the player's token.
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
    <h6>The name of the player to move is highlighted with their color.</h6>
    <h6>
      If it is your turn and you do a single action, like building a wall or
      moving to an adjacent cell, you can undo it by clicking the wall again or
      clicking a different ground cell, respectively. Once you choose 2 actions,
      the move becomes permanent.
    </h6>
  </div>
);

export default gameHelp;
