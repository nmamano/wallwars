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

- No registration needed to play (start playing with 1 click).
- Customizable time controls (duration + increment)
- Make premoves during your opponent's turn.
- Move with keyboard arrows.
- Out-of-game interactions: resign, offer draw, request takeback, and increase the opponent's time.
- Navigate to any previous position during/after the game.
- Ability to request a rematch and play multi-game sessions.
- Multi-game scores (a win is 1 point and a draw is 0.5).
- Real time indicator of when the opponent disconnects.
- Ability to return to a game even after closing the browser (as long as it's from the same browser).
- Clients ping the server periodically to detect connection issues early.
- Responsive design for mobile (except that there are 437 cells, so it is hard to tap the right one in a small screen).
- Optional sound effect for moves.
- Two color themes, each with a night mode.
- Adjustable board scaling to fit different screen sizes.
- Customizable tokens (the look of your piece)
- Settings are stored in cookies for convenience (username, time control, token image, color theme, night mode, ...).
- Watch recent past games played by anyone.
- Past games are chosen randomly to be showcased (auto-played) in the lobby.

## Coming features

- Create public games that anyone can see and join from the lobby without a join code.
- List ongoing public games in the lobby and allow to spectate them in real time.
- Offline/local game mode to be able to play with someone else on the same computer without connecting to the server.
- Study session: mode where you can explore a game with more flexibility (e.g., you can branch off and return to the main move sequence). This mode will be online so you can invite other people to a study session with a join code.
- On mobile, place walls by sliding the finger between two ground cells (to require less precision).
- If the server restarts (which Heroku does, from time to time), restore ongoing games behind the scenes by sending the game state from the clients to the server.
- Visual highlight of the last move played on the board, to direct the attention of the players to the action (since walls can be placed anywhere, the move that was made may be not obvious. Currently, players can look at the last move in the move history to be sure).

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
