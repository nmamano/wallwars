const { logMessage } = require("./logUtils");
const M = require("./messageList");

const emitMessageSubscriber = (subscribedSocket, msgTitle, msgParams) => {
  if (msgParams) subscribedSocket.emit(msgTitle, msgParams);
  else subscribedSocket.emit(msgTitle);
  logMessage(
    "SUBSCRIBER",
    subscribedSocket.id,
    null,
    true,
    msgTitle,
    msgParams
  );
};

class ChallengeBroadcast {
  constructor() {
    this.subscribedSockets = [];
  }

  addSubscriber(socket) {
    this.subscribedSockets.push(socket);
  }

  removeSubscriber(socketId) {
    for (let i = 0; i < this.subscribedSockets.length; i += 1) {
      const cur = this.subscribedSockets[i];
      if (cur.id === socketId) {
        this.subscribedSockets.splice(i, 1);
        return;
      }
    }
    console.error(`couldn't find socket with id ${socketId}`);
  }

  notifyNewChallenge(game) {
    for (let i = 0; i < this.subscribedSockets.length; i += 1) {
      emitMessageSubscriber(this.subscribedSockets[i], M.newChallengeMsg, {
        challenge: game,
      });
    }
  }

  notifyDeadChallenge(joinCode) {
    for (let i = 0; i < this.subscribedSockets.length; i += 1) {
      emitMessageSubscriber(this.subscribedSockets[i], M.deadChallengeMsg, {
        joinCode: joinCode,
      });
    }
  }
}

module.exports = ChallengeBroadcast;
