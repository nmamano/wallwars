# WallWars

## Link to [Play](http://nmamano.com/wallwars/index.html)

http://nmamano.com/wallwars/index.html

Disclaimer 1: if nobody has played in a while, the server can sometimes take a minute to wake up.

Disclaimer 2: mobile devices not recommended for now.

## About

Source code for the frontend and backend of "WallWars", an online 2-player strategy game.

The goal of each player is to get to their goal before the opponent gets to theirs, building walls to reshape the terrain to their advantage.

It is inspired by a board game I played once as a kid, of which I don't remember the name, unfortunately.

### Tools used

#### Frontend

- React as framework
- [Materialize](https://materializecss.com/) for styling (with the [react-materialize](http://react-materialize.github.io/react-materialize/?path=/story/react-materialize--welcome) wrapper)
- [gh-pages module](https://www.npmjs.com/package/gh-pages) to host the client directly from the github repo (it uses the gh-pages branch).

#### Backend

- Node.js and express for the server
- [Socket.io](https://socket.io/) for real-time two-way communication with the clients
- Heroku to deploy the backend server with Git integration.

## License

MIT
