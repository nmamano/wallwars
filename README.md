# WallWars

## [Click here to play](http://nmamano.com/wallwars/index.html)

Url to play: http://nmamano.com/wallwars/index.html

Note: if nobody has played in a while, sometimes the server takes a few seconds to wake up.

## About

Source code for the frontend and backend of "WallWars", an online 2-player strategy game.

The goal of each player is to reach their goal before the opponent gets to theirs, placing walls to reshape the terrain to their advantage.

WallWars is inspired by board games Blockade and Quoridor. The main
difference is that in WallWars there is no limit to how many walls you
can place, and moves are more flexible (for instance, you can move and
place a wall in the same turn).

## Features

- Create public games that anyone can see and join from the lobby, or private games that can only be joined with a join code.
- No registration needed to play (start playing with 1 click).
- Navigate through recent past games played by anyone and watch any of them.
- Random past games are showcased (auto-played) in the lobby.
- Customizable game settings, like time controls (duration + increment) and board dimensions.
- Make premoves during your opponent's turn.
- Move with mouse or keyboard arrows.
- Out-of-board interactions: resign, offer draw, request takeback, and increase the opponent's remaining time.
- Navigate to any previous position during or after the game.
- Ability to request a rematch and play multi-game matches.
- Gicko-2 rating system and ranking (ELO-like system).
- Multi-game scores (a win is 1 point and a draw is 0.5).
- Ability to return to a game even after leaving the page.
- Real-time indicator of when the opponent disconnects/returns to the game.
- Responsive design for mobile (smaller board dimensions recommended, as it can be hard to tap the right cell in a small screen).
- Optional sound effect for moves.
- Two color themes (red/green and blue only), each with a dark mode.
- Adjustable board scaling to fit different screen sizes.
- Customizable tokens (the look of your piece).
- Settings are stored in cookies for convenience (username, time control, board dimensions, token, color theme, dark mode, ...).
- Visual highlight of the last move played on the board.

## Planned features

- List ongoing public games in the lobby and allow to spectate them in real time.
- Offline/local game mode to be able to play with someone else on the same computer without connecting to the server.
- Study session: mode where you can explore a game with more flexibility (e.g., you can branch off and return to the main move sequence). This mode will be online so you can invite other people to a study session with a join code.
- On mobile, place walls by sliding the finger between two ground cells (to require less precision).
- If the server restarts (which Heroku does, from time to time), restore ongoing games behind the scenes by sending the game state from the clients to the server.

## Tools used

### Frontend

- React as the framework.
- [gh-pages module](https://www.npmjs.com/package/gh-pages) to host the client directly from this github repo (it uses the gh-pages branch).

### Backend

- Node.js and express for the server.
- [Socket.io](https://socket.io/) for real-time two-way client-server communication.
- MongoDB to store finished games.
- Heroku to deploy the backend server with Git integration.

## License

MIT
