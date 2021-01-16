const fs = require("fs");
const util = require("util");

//middleware for logging incoming and outgoing messages
//format: hh:mm:ss ss|ccc|J -> #SERVER#: m [gg] {p}
//ss: first 2 chars of the socket id,
//ccc: first 3 chars of the cookie id, or '___' if unknown
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
const cropAndLogMessage = (txt) => {
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

exports.logMessage = function (
  cookieId,
  socketId,
  game,
  sent,
  messageTitle,
  messageParams
) {
  const shortCookieId = cookieId ? cookieId.substring(0, 3) : "___";
  const shortSocketId = socketId.substring(0, 2);
  let client = shortSocketId + "," + shortCookieId;
  const date = new Date();
  let [hs, ms, ss] = [date.getHours(), date.getMinutes(), date.getSeconds()];
  if (ms < 10) ms = "0" + ms;
  if (ss < 10) ss = "0" + ss;
  let logText = `${hs}:${ms}:${ss} `;
  if (game) {
    const isCreator = cookieId === game.cookieIds[0];
    client += `,${isCreator ? "C" : "J"}`;
  } else {
    client += ",_";
  }
  const serv = "#SERVER#";
  const arrow = " -> ";
  logText += sent ? serv + arrow + client : client + arrow + serv;
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
};
