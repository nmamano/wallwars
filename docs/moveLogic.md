# Context

This file documents how the state changes when a player selects a ground or wall cell.

In this game, each "move" consists of two "actions". There are two types of cells: 'ground' and 'wall' cells. Building a wall counts as one action. Taking one step to an adjacent ground cell also counts as one action. This means that, if the player clicks a cell at distance 2, that single click accounts for 2 actions.

Players can do (and undo) one action applied individually in their local view, without it being sent to the server. This is called a "ghost action", because the other client does not see it. Once the player adds a second action, the two actions together are applied to the board as a full move and also sent to the other client through the server.

To save time, during the opponent's turn, players can set their actions (full actions or ghost actions) for their next turn. These are called "premoves".

## Terminology

- Cell: a position in the board. There are Ground and Wall cells.
- Action: a ground cell at distance 1 from the player or an empty wall.
- Full move (or just move): a set of two actions actually played by the player and received by the opponent.
- Ghost action: a single action selected by the player during their turn.
- Premoves: one or two actions selected by the player during the opponent's turn.

## Case analysis

The ghost action can be in 3 different states:

- empty (denoted {}): no ghost action
- wall (denoted {W}): ghost action is a wall cell W which does not block either player from reaching their goal
- ground (denoted {G}): ghost action is a ground cell G at distance 1 or 2 from the player

For each combination of the current ghost action state and where the player clicks,
the ghost action may change, or a full move might be triggered.
After making a move, the ghost actions are cleared, so the ghost action state goes back to {}

If the player clicks on an already built wall or a ground cell at distance >2, nothing changes.
If the player clicks the player's position, the ghost actions become empty.
Otherwise, here is what should happen, based on the ghost state and where the player clicks.

### Case: empty ghost action {}

- an empty wall W which does not block any players -> new ghost: {W}
- an empty wall W which blocks one of the players -> no change
- a ground cell G at distance 1 -> new ghost: {G}
- a ground cell G at distance 2 -> full move: {G}

### Case: wall ghost action {W}

- an empty wall W2 which together with W do not block any players -> full move: {W,W2}
- an empty wall W2 which together with W2 blocks a player -> no change
- W -> new ghost: {}
- a ground cell at distance 2 -> no change
- a ground cell G at distance 1 -> full move: {G,W}

### Case ground ghost action {G}

- an empty wall W s.t. W does not block the player goal (from G) nor the other player -> full move: {G,W}
- an empty wall W s.t. W blocks the player (from G) or the other player -> no change
- G -> new ghost: {}
- a cell G2 at distance 1 other than G -> new ghost: {G2}
- a cell G2 at distance 2 -> full move: {G2}

# Premoves

There can be 0 to 2 premove actions. Once the opponent moves, the game behaves as if the client inputted the premove actions during their turn. That means they can become an actual move, a ghost action, or do nothing if not legal.

## Case analysis

The premove actions can be in the following different states:

- empty (denoted {}): no premove action
- wall (denoted {W}): premove action is a wall cell W which does not block either player from reaching their goal
- walls (denoted {W1,W2}): premove actions are 2 walls W1, W2 which collectively do not block either player from reaching their goal
- ground (denoted {G}): premove action is a a ground cell G at distance 1 from the player
- ground (denoted {G'}): premove action is a a ground cell G' at distance 2 from the player
- ground-wall (denoted {G,W}): premove actions consist of 1 wall which does not block either player from reaching their goal and 1 ground cell at distance 1 from the player

For each combination of the current premove actions state and where the player clicks,
the premove actions may change.

If the player clicks on an already built wall or a ground cell at distance >2, nothing changes.
If the player clicks the player's position, the premove actions become empty.
Otherwise, here is what the new premove actions should be, based on the ghost state and where the player clicks.

### Case: empty premove actions {}

- an empty wall W which does not block any players -> {W}
- an empty wall W which blocks one of the players -> no change
- a ground cell G at distance 1 or 2 -> {G}

### Case: wall premove action {W}

- an empty wall W2 which together with W do not block any players -> {W,W2}
- an empty wall W2 which together with W2 blocks a player -> no change
- W -> {}
- a ground cell G at distance 1 -> {G,W}
- a ground cell G' at distance 2 -> no change

### Case: two wall premove actions {W1, W2}

- an empty wall W3 -> no change
- W1 -> {W2}
- W2 -> {W1}
- a ground cell -> no change

### Case ground premove action at distance 1 {G}

- an empty wall W s.t. W does not block the player goal (from G) nor the other player -> {G,W}
- an empty wall W s.t. W blocks the player (from G) or the other player -> no change
- G -> {}
- any other cell G2 at distance 1 or 2 -> {G2}

### Case ground premove action at distance 2 {G'}

- a wall -> no change
- G' -> {}
- any other cell G2 at distance 1 or 2 -> {G2}

### Case ground-wall premove actions {G,W}

- W -> {G}
- Any wall other than W -> no change
- G -> {W} if W does not block the player, {} otherwise
- a ground cell G2 at distance 1 other than G -> {G2,W} if W does not block the player from G2, otherwise {G2}
- a ground cell G2' at distance 2 -> no change

### After the opponent moves:

- If there are no premove actions, the ghost action becomes {}.
- If there is a single premove action which is not a ground cell at distance 2, the action becomes a ghost action if possible after the opponent move. The ghost action becomes {} otherwise.
- "All or nothing" rule for full-move premoves: If there were 2 premove actions or a single premove action which was a ground cell at distance 2, if the move is legal, it is played. Otherwise, no move is played and the ghost action is {}.
