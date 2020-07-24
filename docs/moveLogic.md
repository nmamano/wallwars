# Context

In this game, each "move" consists of two "actions". Players can do (and undo) one action applied individually in their local view, without it being sent to the server. This is called a "ghost action", because the other client does not see it. Once the player adds a second action, the two actions together are applied to the board as a full move and the actions are also sent to the other client through the server.

There are two types of cells: 'ground' and 'wall' cells. Building a wall counts as one action. Taking one step to an adjacent ground cell also counts as one action. This means that, if the player clicks a cell at distance 2, that single click accounts for 2 actions.

## Terminology

- Cell: a position in the board. There are Ground and Wall cells.
- Action: a ground cell at distance 1 from the player or an empty wall.
- Full move (or just move): a set of two actions played by the player.
- Ghost action: a single action selected by the player

# Case analysis

The ghost action can be in 3 different states:

- empty: no ghost action (denoted {})
- ghost-wall: ghost action is a wall cell W (denoted {W})
- ghost-ground: ghost action is a a ground cell G (denoted {G})

For each combination of the current ghost action state and where the player clicks,
the ghost action may change, or a full move might be triggered.
After making a move, the ghost actions are cleared, so the ghost action state goes back to {}

## Ghost action state: {}

Player clicks on:

- an empty wall W which does not block any players -> new ghost: {W}
- an empty wall W which blocks one of the players -> no change
- a built wall -> no change
- a ground cell at distance 0 or >2 -> no change
- a ground cell G at distance 1 -> new ghost: {G}
- a ground cell G at distance 2 -> full move: {G}

## Ghost action state: {W}

Player clicks on:

- an empty wall W2 which together with W do not block any players -> full move: {W,W2}
- an empty wall W2 which together with W2 blocks a player -> no change
- W -> new ghost: {}
- any already-built wall -> no change
- a ground cell at distance 0 or >1 -> no change
- a ground cell G at distance 1 -> full move: {G,W}

## Ghost action state: {G}

Player clicks on:

- an empty wall W s.t. W does not block the player goal (from G) nor the other player -> full move: {G,W}
- an empty wall W s.t. W blocks the player (from G) or the other player -> no change
- a built wall -> no change
- a cell at distance 0 -> new ghost: {}
- a cell G2 at distance 1 (G2 may be the same as G) -> new ghost: {G2}
- a cell G2 at distance 2 -> full move: {G2}
- a cell at distance >2 -> no change
