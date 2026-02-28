# WallWars

## [Click here to play](https://wallwars.net)

Url to play: https://wallwars.net

WallWars discord: https://discord.gg/nwHWzbyJtd
(to find players to play, or discuss the game's development)

## About

Source code for the frontend and backend of "WallWars", an online 2-player strategy game (There is also an AI with a CLI tool which is not yet integrated with the website).

The goal of each player is to reach their goal before the opponent gets to theirs, placing walls to reshape the terrain to their advantage.

WallWars is inspired by board games Blockade and Quoridor. The main
difference is that in WallWars there is no limit to how many walls you
can place, and moves are more flexible (for instance, you can move and
place a wall in the same turn).

## Features

1. Create public games that anyone can see and join from the lobby, or private games that can only be joined with a join code.
1. No registration needed to play (start playing with 1 click).
1. Navigate through recent past games played by anyone and watch any of them.
1. Random past games are showcased (auto-played) in the lobby.
1. Play offline games against real-life friends.
1. Customizable game settings, like time controls (duration + increment) and board dimensions.
1. Make premoves during your opponent's turn.
1. Move with mouse or keyboard arrows.
1. Out-of-board interactions: resign, offer draw, request takeback, and increase the opponent's remaining time.
1. Navigate to any previous position during or after the game.
1. Ability to request a rematch and play multi-game matches.
1. Gicko-2 rating system and ranking (ELO-like system).
1. Multi-game scores (a win is 1 point and a draw is 0.5).
1. Ability to return to a game even after leaving the page.
1. Real-time indicator of when the opponent disconnects/returns to the game.
1. Responsive design for mobile (smaller board dimensions recommended, as it can be hard to tap the right cell in a small screen).
1. Optional sound effect for moves.
1. Two color themes (red/green and blue only), each with a dark mode.
1. Adjustable board scaling to fit different screen sizes.
1. Customizable tokens (the look of your piece).
1. Settings are stored in cookies for convenience (username, time control, board dimensions, token, color theme, dark mode, ...).
1. Visual highlight of the last move played on the board.
1. Use ctrl+click to highlight cells without making a move.

## Planned features

- List ongoing public games in the lobby and allow to spectate them in real time.
- Play against an AI.

## Tools used

### Frontend

- React as the framework.
- Vercel for hosting and continuous deployment.

### Backend

- Node.js and express for the server.
- [Socket.io](https://socket.io/) for real-time two-way client-server communication.
- MongoDB as the database.
- Fly.io to deploy the backend server.

### AI

- C++ (in the future, the AI may be integrated with the website via the cpp -> llvm -> wasm -> js pipeline).

## License

MIT
