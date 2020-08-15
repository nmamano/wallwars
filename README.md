# WallWars

## Link to [Play](http://nmamano.com/wallwars/index.html)

http://nmamano.com/wallwars/index.html

Disclaimer: if nobody has played in a while, the server can sometimes take a minute to wake up.

It works on mobile devices, except that the cells are quite small so it is hard to tap the right one.

## About

Source code for the frontend and backend of "WallWars", an online 2-player strategy game.

The goal of each player is to get to their goal before the opponent gets to theirs, placing walls to reshape the terrain to their advantage.

WallWars is inspired by board games Blockade and Quoridor. The main
difference is that in WallWars there is no limit to how many walls you
can place, and moves are more flexible (for instance, you can move and
place a wall in the same turn).

### Tools used

#### Frontend

- React as the framework.
- [Materialize](https://materializecss.com/) for styling.
- [gh-pages module](https://www.npmjs.com/package/gh-pages) to host the client directly from the github repo (it uses the gh-pages branch).

#### Backend

- Node.js and express for the server.
- [Socket.io](https://socket.io/) for real-time two-way communication with the clients.
- Heroku to deploy the backend server with Git integration.

## License

MIT
