import { roundNum } from "../shared/utils";
import { getColor, MenuThemeName } from "../shared/colorThemes";
import { TimeControl } from "../shared/gameLogicUtils";
import { FinishReason, WinnerEnum, LifeCycleStage } from "./gameState";

export default function StatusHeader({
  lifeCycleStage,
  names,
  winner,
  finishReason,
  indexToMove,
  timeControl,
  creatorStarts,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
}: {
  lifeCycleStage: LifeCycleStage;
  names: [string, string];
  winner: WinnerEnum;
  finishReason: FinishReason;
  indexToMove: number;
  timeControl: TimeControl;
  creatorStarts: boolean;
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
}): JSX.Element {
  let msg;
  const nameToMove = names[indexToMove];
  const finishMessage = {
    time: "on time",
    goal: "by reaching the goal",
    resign: "by resignation",
    abandon: "by abandonment",
  };
  const drawFinishMessage = {
    goal: "by the 1-move rule",
    agreement: "by agreement",
  };
  switch (lifeCycleStage) {
    case -2:
      msg = "Haven't tried to connect to the server yet";
      break;
    case -1:
      msg = "Waking the server up...";
      break;
    case 0:
      msg = "Waiting for player 2 to join";
      break;
    case 1:
      msg = `${nameToMove} starts`;
      break;
    case 2:
    case 3:
      msg = `${nameToMove} to move`;
      break;
    case 4:
      if (winner === WinnerEnum.Draw)
        msg =
          "The game ended in a draw " +
          drawFinishMessage[finishReason as "goal" | "agreement"];
      else
        msg = `${names[winner === WinnerEnum.Creator ? 0 : 1]} won ${
          finishMessage[finishReason as "time" | "goal" | "resign" | "abandon"]
        }`;
      break;
    default:
      console.error("stage should be in range [-2..4]");
  }

  let firstMoveName = "";
  if (lifeCycleStage === 0 && creatorStarts) firstMoveName = names[0];
  else if (lifeCycleStage > 0) firstMoveName = names[creatorStarts ? 0 : 1];

  return (
    <div
      style={{
        backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
        display: "grid",
        gridTemplateColumns: "auto",
        gridTemplateRows: "1fr 1fr 1fr",
        alignItems: "center",
        padding: isLargeScreen ? "15px 15px" : "5px 15px",
        gridArea: "status",
      }}
    >
      <div>
        <p>{msg}</p>
      </div>
      <div>
        {timeControl && (
          <p>
            Time control: {roundNum(timeControl.duration)}+
            {roundNum(timeControl.increment)}
          </p>
        )}
      </div>
      <div>
        <p>{"First move: " + firstMoveName}</p>
      </div>
    </div>
  );
}
