class GameManager {
  constructor() {
    //if there were many concurrent users, this should be converted into a map
    //to avoid linear search. Not needed for now
    this.unjoinedGames = [];
    //games are removed from ongoingGames when a players leaves the game page
    //AND the game is over. Or when one of the players creates/joins a new game
    this.ongoingGames = [];
  }

  unjoinedGame(joinCode) {
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (game.joinCode === joinCode) return game;
    }
    return null;
  }

  ongoingGameOfClient(eloId) {
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      const [id1, id2] = game.eloIds;
      if (eloId === id1 || eloId === id2) return game;
    }
    return null;
  }

  getOngoingGameByEloId(eloId) {
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      const [id1, id2] = game.eloIds;
      if (eloId === id1 || eloId === id2) return game;
    }
    return null;
  }

  getOpponentSocketId(eloId) {
    const game = this.ongoingGameOfClient(eloId);
    if (!game) return null;
    const [socketId1, socketId2] = game.socketIds;
    return eloId === game.eloIds[0] ? socketId2 : socketId1;
  }
  getOpponentEloId(eloId) {
    const game = this.ongoingGameOfClient(eloId);
    if (!game) return null;
    const [eloId1, eloId2] = game.eloIds;
    return eloId === eloId1 ? eloId2 : eloId1;
  }

  hasOngoingGame(eloId) {
    return this.ongoingGameOfClient(eloId) !== null;
  }

  addUnjoinedGame(game) {
    this.unjoinedGames.push(game);
  }

  moveGameFromUnjoinedToOngoing(joinCode) {
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (game.joinCode === joinCode) {
        this.unjoinedGames.splice(i, 1);
        this.ongoingGames.push(game);
        return;
      }
    }
    console.error(
      `couldn't move game with join code ${joinCode} from unjoined to ongoing`
    );
  }

  removeGamesByEloId(eloId) {
    this.removeUnjoinedGamesByEloId(eloId);
    this.removeOngoingGamesByEloId(eloId);
  }

  //in theory, clients can only have one unjoined game at a time,
  //but we check all to be sure
  removeUnjoinedGamesByEloId(eloId) {
    if (!eloId) return;
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (game.eloIds[0] === eloId) {
        console.log("remove unjoined game: ", JSON.stringify(game));
        this.unjoinedGames.splice(i, 1);
        i--;
      }
    }
  }

  getUnjoinedGameBySocketId(socketId) {
    if (!socketId) return;
    let game;
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      if (this.unjoinedGames[i].socketIds[0] === socketId) {
        game = this.unjoinedGames[i];
      }
    }
    return game;
  }

  getOpenChallenges() {
    const res = [];
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (game.isPublic) {
        res.push(game);
      }
    }
    return res;
  }

  //in theory, clients can only have one ongoing game at a time,
  //but we check all to be sure
  removeOngoingGamesByEloId(eloId) {
    if (!eloId) return;
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      if (game.eloIds[0] === eloId || game.eloIds[1] === eloId) {
        this.ongoingGames.splice(i, 1);
        console.log("removed ongoing game: ", JSON.stringify(game));
        i--;
      }
    }
  }

  printAllGames() {
    console.log("Unjoined games:\n", this.unjoinedGames);
    console.log("Ongoing games:\n", this.ongoingGames);
  }
}

module.exports = GameManager;
