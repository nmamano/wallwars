import { GameState } from "./gameState";

// Manages the pairings between clients currently playing.
export class GameManager {
  unjoinedGames: GameState[];
  ongoingGames: GameState[];

  constructor() {
    //if there were many concurrent users, this should be converted into a map
    //to avoid linear search. Not needed for now
    this.unjoinedGames = [];
    //games are removed from ongoingGames when a players leaves the game page
    //AND the game is over. Or when one of the players creates/joins a new game
    this.ongoingGames = [];
  }

  unjoinedGame(joinCode: string): GameState | null {
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (game.joinCode === joinCode) return game;
    }
    return null;
  }

  ongoingGameOfClient(idToken: string | null): GameState | null {
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      const [idToken1, idToken2] = game.idTokens;
      if (idToken === idToken1 || idToken === idToken2) return game;
    }
    return null;
  }

  getOngoingGameByIdToken(idToken: string): GameState | null {
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      const [idToken1, idToken2] = game.idTokens;
      if (idToken === idToken1 || idToken === idToken2) return game;
    }
    return null;
  }

  getOpponentSocketId(idToken: string | null): string | null {
    const game = this.ongoingGameOfClient(idToken);
    if (!game) return null;
    const [socketId1, socketId2] = game.socketIds;
    return idToken === game.idTokens[0] ? socketId2 : socketId1;
  }

  getOpponentIdToken(idToken: string | null): string | null {
    const game = this.ongoingGameOfClient(idToken);
    if (!game) return null;
    const [idToken1, idToken2] = game.idTokens;
    return idToken === idToken1 ? idToken2 : idToken1;
  }

  hasOngoingGame(IdToken: string): boolean {
    return this.ongoingGameOfClient(IdToken) !== null;
  }

  addUnjoinedGame(game: GameState): void {
    this.unjoinedGames.push(game);
  }

  moveGameFromUnjoinedToOngoing(joinCode: string): void {
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

  removeGamesByIdToken(IdToken: string): void {
    this.removeUnjoinedGamesByIdToken(IdToken);
    this.removeOngoingGamesByIdToken(IdToken);
  }

  //in theory, clients can only have one unjoined game at a time,
  //but we check all to be sure
  removeUnjoinedGamesByIdToken(IdToken: string): void {
    if (!IdToken) return;
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (game.idTokens[0] === IdToken) {
        console.log("remove unjoined game: ", JSON.stringify(game));
        this.unjoinedGames.splice(i, 1);
        i--;
      }
    }
  }

  getUnjoinedGamesBySocketId(socketId: string): GameState | undefined {
    if (!socketId) return;
    let game;
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      if (this.unjoinedGames[i].socketIds[0] === socketId) {
        game = this.unjoinedGames[i];
      }
    }
    return game;
  }

  getOpenChallenges(): GameState[] {
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
  removeOngoingGamesByIdToken(IdToken: string): void {
    if (!IdToken) return;
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      if (game.idTokens[0] === IdToken || game.idTokens[1] === IdToken) {
        this.ongoingGames.splice(i, 1);
        console.log("removed ongoing game: ", JSON.stringify(game));
        i--;
      }
    }
  }

  printAllGames(): void {
    console.log("Unjoined games:\n", this.unjoinedGames);
    console.log("Ongoing games:\n", this.ongoingGames);
  }
}
