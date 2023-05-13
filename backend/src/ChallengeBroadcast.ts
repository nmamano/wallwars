import { logMessage } from "./logUtils";
import M from "./messageList";
import { GameState } from "./gameState";

export default class ChallengeBroadcast {
  subscribedSockets: any[];

  constructor() {
    this.subscribedSockets = [];
  }

  addSubscriber(socket: any) {
    this.subscribedSockets.push(socket);
  }

  removeSubscriber(socketId: string) {
    for (let i = 0; i < this.subscribedSockets.length; i++) {
      const cur = this.subscribedSockets[i];
      if (cur.id === socketId) {
        this.subscribedSockets.splice(i, 1);
        return;
      }
    }
    console.error(`couldn't find socket with id ${socketId}`);
  }

  notifyNewChallenge(game: GameState) {
    for (let i = 0; i < this.subscribedSockets.length; i++) {
      emitMessageSubscriber(this.subscribedSockets[i], M.newChallengeMsg, {
        challenge: game,
      });
    }
  }

  notifyDeadChallenge(joinCode: string) {
    for (let i = 0; i < this.subscribedSockets.length; i++) {
      emitMessageSubscriber(this.subscribedSockets[i], M.deadChallengeMsg, {
        joinCode: joinCode,
      });
    }
  }
}

function emitMessageSubscriber(
  subscribedSocket: any,
  msgTitle: string,
  msgParams: any
) {
  if (msgParams) subscribedSocket.emit(msgTitle, msgParams);
  else subscribedSocket.emit(msgTitle);
  logMessage({
    idToken: "SUBSCRIBER",
    socketId: subscribedSocket.id,
    game: null,
    sent: true,
    messageTitle: msgTitle,
    messageParams: msgParams,
  });
}
