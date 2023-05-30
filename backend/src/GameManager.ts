import { GameState } from "./gameState";

// Manages the pairings between clients currently playing. This is stored in
// memory, not in the DB, so it is lost if the server restarts.
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

  getOngoingGameByClient(idToken: string, socketId: string): GameState | null {
    // If the idToken is available, match based on that. If not (the user is a
    // guest), match based on the socket id.
    if (idToken !== "") {
      for (let i = 0; i < this.ongoingGames.length; i++) {
        const game = this.ongoingGames[i];
        if (game.idTokens.includes(idToken)) return game;
      }
      return null;
    }
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      if (game.socketIds.includes(socketId)) return game;
    }
    return null;
  }

  getOpponentSocketId(idToken: string, socketId: string): string | null {
    const game = this.getOngoingGameByClient(idToken, socketId);
    if (!game) return null;
    return socketId === game.socketIds[0]
      ? game.socketIds[1]
      : game.socketIds[0];
  }

  getOpponentIdToken(idToken: string, socketId: string): string | null {
    const game = this.getOngoingGameByClient(idToken, socketId);
    if (!game) return null;
    return socketId === game.socketIds[0] ? game.idTokens[1] : game.idTokens[0];
  }

  hasOngoingGame(idToken: string, socketId: string): boolean {
    return this.getOngoingGameByClient(idToken, socketId) !== null;
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

  removeGamesByClient(idToken: string, socketId: string): void {
    this.removeUnjoinedGamesByClient(idToken, socketId);
    this.removeOngoingGamesByClient(idToken, socketId);
  }

  // Remove any games with matching socket id or id token. In theory, clients
  // can only have one unjoined game at a time, but we check all to be sure.
  removeUnjoinedGamesByClient(idToken: string, socketId: string): void {
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (createdByClient(idToken, socketId, game)) {
        console.log("remove unjoined game: ", JSON.stringify(game));
        this.unjoinedGames.splice(i, 1);
        i--;
      }
    }
  }

  getUnjoinedGameByClient(
    idToken: string,
    socketId: string
  ): GameState | undefined {
    let game;
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      if (createdByClient(idToken, socketId, this.unjoinedGames[i])) {
        game = this.unjoinedGames[i];
        break;
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

  // In theory, clients can only have one ongoing game at a time,
  // but we check all to be sure.
  removeOngoingGamesByClient(idToken: string, socketId: string): void {
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      if (containsClient(idToken, socketId, game)) {
        this.ongoingGames.splice(i, 1);
        console.log("removed ongoing game: ", JSON.stringify(game));
        i--;
      }
    }
  }

  getSocketIdByIdToken(idToken: string): string | null {
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      if (idToken === game.idTokens[0]) return game.socketIds[0];
      if (idToken === game.idTokens[1]) return game.socketIds[1];
    }
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (idToken === game.idTokens[0]) return game.socketIds[0];
      if (idToken === game.idTokens[1]) return game.socketIds[1];
    }
    return null;
  }

  // The socket id of any games with this token id gets updated to a new one.
  updateSocketIdByIdToken(idToken: string, socketId: string): void {
    for (let i = 0; i < this.ongoingGames.length; i++) {
      const game = this.ongoingGames[i];
      if (idToken === game.idTokens[0]) game.socketIds[0] = socketId;
      if (idToken === game.idTokens[1]) game.socketIds[1] = socketId;
    }
    for (let i = 0; i < this.unjoinedGames.length; i++) {
      const game = this.unjoinedGames[i];
      if (idToken === game.idTokens[0]) game.socketIds[0] = socketId;
      if (idToken === game.idTokens[1]) game.socketIds[1] = socketId;
    }
  }

  printAllGames(): void {
    console.log("Unjoined games:\n", this.unjoinedGames);
    console.log("Ongoing games:\n", this.ongoingGames);
  }
}

function createdByClient(
  idToken: string,
  socketId: string,
  game: GameState
): boolean {
  return (
    (idToken !== "" && idToken === game.idTokens[0]) ||
    socketId === game.socketIds[0]
  );
}

function joinedByClient(
  idToken: string,
  socketId: string,
  game: GameState
): boolean {
  return (
    (idToken !== "" && idToken === game.idTokens[1]) ||
    socketId === game.socketIds[1]
  );
}

function containsClient(
  idToken: string,
  socketId: string,
  game: GameState
): boolean {
  return (
    createdByClient(idToken, socketId, game) ||
    joinedByClient(idToken, socketId, game)
  );
}
