import fs from "fs";
import util from "util";
import { GameState } from "./gameState";

const auth0Prefix = "auth0|";

//middleware for logging incoming and outgoing messages
//format: hh:mm:ss ss|ccc|J -> #SERVER#: m [gg] {p}
//ss: first 2 chars of the socket id,
//ccc: first 3 chars of the idToken after the "Auth0|" prefix, or "GST" for guests
//J: client role. 'C' for creator, 'J' for joiner, or '_' if not in a game
//X -> Y: X is the sender and Y the receiver. One of them is SERVER
//m: message title
//gg: first 2 chars of the join code ([gg] is missing if the client is not in a game)
//p: key-value pairs of the message parameters. May be cut short if too long
//in the local environment (not production) all the logs are saved to 'debug.log'
const DEBUG_FILE = "/../debug.log";
const SAVE_FULL_LOGS = process.env.LOG_MESSAGES || false;
var messageLogFile = fs.createWriteStream(__dirname + DEBUG_FILE, {
  flags: "w",
});
const cropAndLogMessage = (txt: string) => {
  const maxLogLen = 1000;
  const maxTerminalLen = 140;
  if (SAVE_FULL_LOGS) {
    let logTxt = txt;
    if (logTxt.length > maxLogLen) {
      logTxt = logTxt.substring(0, maxLogLen - 3) + "...";
    }
    messageLogFile.write(util.format(logTxt) + "\n");
  }
  if (txt.length > maxTerminalLen) {
    txt = txt.substring(0, maxTerminalLen - 3) + "...";
  }
  console.log(txt);
};

export function logMessage({
  idToken,
  socketId,
  game,
  sent,
  messageTitle,
  messageParams,
}: {
  idToken: string; // Empty for guests.
  socketId: string;
  game: GameState | null;
  sent: boolean;
  messageTitle: string;
  messageParams: any;
}) {
  let shortIdToken =
    idToken === ""
      ? "GST"
      : idToken.substring(auth0Prefix.length, auth0Prefix.length + 3);
  const shortSocketId = socketId.substring(0, 2);
  let client = shortSocketId + "," + shortIdToken;
  const date = new Date();
  let [hs, ms, ss] = [date.getHours(), date.getMinutes(), date.getSeconds()];
  let msStr = ms < 10 ? "0" + ms : ms;
  let ssStr = ss < 10 ? "0" + ss : ss;
  let logText = `${hs}:${msStr}:${ssStr} `;
  if (game) {
    const isCreator = idToken === game.idTokens[0];
    client += `,${isCreator ? "C" : "J"}`;
  } else {
    client += ",_";
  }
  const server = "#SERVER#";
  const arrow = " -> ";
  logText += sent ? server + arrow + client : client + arrow + server;
  logText += `: ${messageTitle}`;
  if (game) {
    const shortJoinCode = game.joinCode.substring(0, 2);
    logText += ` [${shortJoinCode}]`;
  }
  if (messageParams) {
    const paramsText = JSON.stringify(messageParams);
    logText += " " + paramsText;
  }
  cropAndLogMessage(logText);
}
