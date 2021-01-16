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
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.joinCode === joinCode) return game;
    }
    return null;
  }

  ongoingGameOfClient(cookieId) {
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      const [id1, id2] = game.cookieIds;
      if (cookieId === id1 || cookieId === id2) return game;
    }
    return null;
  }

  getOngoingGameByCookieId(cookieId) {
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      const [id1, id2] = game.cookieIds;
      if (cookieId === id1 || cookieId === id2) return game;
    }
    return null;
  }

  getOpponentSocketId(cookieId) {
    const game = this.ongoingGameOfClient(cookieId);
    if (!game) return null;
    const [socketId1, socketId2] = game.socketIds;
    return cookieId === game.cookieIds[0] ? socketId2 : socketId1;
  }
  getOpponentCookieId(cookieId) {
    const game = this.ongoingGameOfClient(cookieId);
    if (!game) return null;
    const [cookieId1, cookieId2] = game.cookieIds;
    return cookieId === cookieId1 ? cookieId2 : cookieId1;
  }

  hasOngoingGame(cookieId) {
    return this.ongoingGameOfClient(cookieId) !== null;
  }

  addUnjoinedGame(game) {
    this.unjoinedGames.push(game);
  }

  moveGameFromUnjoinedToOngoing(joinCode) {
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
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

  removeGamesByCookieId(cookieId) {
    this.removeUnjoinedGamesByCookieId(cookieId);
    this.removeOngoingGamesByCookieId(cookieId);
  }

  //in theory, clients can only have one unjoined game at a time,
  //but we check all to be sure
  removeUnjoinedGamesByCookieId(cookieId) {
    if (!cookieId) return;
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.cookieIds[0] === cookieId) {
        console.log("remove unjoined game: ", JSON.stringify(game));
        this.unjoinedGames.splice(i, 1);
        i -= 1;
      }
    }
  }

  getUnjoinedGameBySocketId(socketId) {
    if (!socketId) return;
    let game;
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      if (this.unjoinedGames[i].socketIds[0] === socketId) {
        game = this.unjoinedGames[i];
      }
    }
    return game;
  }

  getOpenChallenges() {
    const res = [];
    for (let i = 0; i < this.unjoinedGames.length; i += 1) {
      const game = this.unjoinedGames[i];
      if (game.isPublic) {
        res.push(game);
      }
    }
    return res;
  }

  //in theory, clients can only have one ongoing game at a time,
  //but we check all to be sure
  removeOngoingGamesByCookieId(cookieId) {
    if (!cookieId) return;
    for (let i = 0; i < this.ongoingGames.length; i += 1) {
      const game = this.ongoingGames[i];
      if (game.cookieIds[0] === cookieId || game.cookieIds[1] === cookieId) {
        this.ongoingGames.splice(i, 1);
        console.log("removed ongoing game: ", JSON.stringify(game));
        i -= 1;
      }
    }
  }

  printAllGames() {
    console.log("Unjoined games:\n", this.unjoinedGames);
    console.log("Ongoing games:\n", this.ongoingGames);
  }
}

module.exports = GameManager;
