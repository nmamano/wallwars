import IconButton from "../shared/IconButton";
import { BoardThemeName, getColor, MenuThemeName } from "../shared/colorThemes";
import { LifeCycleStage, RoleEnum } from "./gameState";
import { MoveHistory } from "../shared/gameLogicUtils";
import MoveHistoryTable from "./MoveHistory";

export default function GameControlPanel({
  lifeCycleStage,
  handleResign,
  handleOfferDraw,
  handleRequestTakeback,
  handleGiveExtraTime,
  moveHistory,
  clientRole,
  creatorStarts,
  handleViewMove,
  viewIndex,
  turnCount,
  handleSeeFirstMove,
  handleSeePreviousMove,
  handleSeeNextMove,
  handleSeeLastMove,
  handleToggleVolume,
  isVolumeOn,
  handleLeaveGame,
  handleIncreaseBoardSize,
  handleDecreaseBoardSize,
  zoomLevel,
  controlPanelHeight,
  isOpponentPresent,
  menuTheme,
  boardTheme,
  isDarkModeOn,
}: {
  lifeCycleStage: LifeCycleStage;
  handleResign: () => void;
  handleOfferDraw: () => void;
  handleRequestTakeback: () => void;
  handleGiveExtraTime: () => void;
  moveHistory: MoveHistory;
  clientRole: RoleEnum;
  creatorStarts: boolean;
  handleViewMove: (index: number) => void;
  viewIndex: number;
  turnCount: number;
  handleSeeFirstMove: () => void;
  handleSeePreviousMove: () => void;
  handleSeeNextMove: () => void;
  handleSeeLastMove: () => void;
  handleToggleVolume: () => void;
  isVolumeOn: boolean;
  handleLeaveGame: () => void;
  handleIncreaseBoardSize: () => void;
  handleDecreaseBoardSize: () => void;
  zoomLevel: number;
  controlPanelHeight: number;
  isOpponentPresent: boolean;
  menuTheme: MenuThemeName;
  boardTheme: BoardThemeName;
  isDarkModeOn: boolean;
}): JSX.Element {
  const padding = 5;
  const gapHeight = 5;
  const buttonHeight = 36;
  const moveHistoryHeight =
    controlPanelHeight - buttonHeight * 3 - gapHeight * 3 - padding * 2;

  const takebackEnabled =
    lifeCycleStage === 3 ||
    (lifeCycleStage === 2 &&
      creatorStarts === (clientRole === RoleEnum.creator));

  // All game functions are disabled for spectator.
  const isSpectator = clientRole === RoleEnum.spectator;
  const isPuzzle = clientRole === RoleEnum.puzzle;

  return (
    <div
      style={{
        backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
        width: "100%",
        height: "auto",
        display: "grid",
        padding: `${padding}px`,
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: `${buttonHeight}px 1fr ${buttonHeight}px ${buttonHeight}px`,
        columnGap: `${gapHeight}px`,
        rowGap: `${gapHeight}px`,
        gridArea: "panel",
      }}
    >
      <IconButton
        icon={"flag"}
        tooltip={"Resign"}
        modalTitle={"Resign"}
        modalBody={"Are you sure you want to resign?"}
        modalConfirmButtonText={"Resign"}
        onClick={handleResign}
        disabled={isSpectator || isPuzzle || lifeCycleStage !== 3}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"local_florist"}
        tooltip={"Offer Draw"}
        modalTitle={"Offer Draw"}
        modalBody={"Are you sure you want to offer a draw?"}
        modalConfirmButtonText={"Offer draw"}
        onClick={handleOfferDraw}
        disabled={
          isSpectator || isPuzzle || !isOpponentPresent || lifeCycleStage !== 3
        }
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"replay"}
        tooltip={"Request takeback"}
        onClick={handleRequestTakeback}
        disabled={
          isSpectator || isPuzzle || !isOpponentPresent || !takebackEnabled
        }
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"add_alarm"}
        tooltip={"Give 60 seconds"}
        onClick={handleGiveExtraTime}
        disabled={isSpectator || isPuzzle || lifeCycleStage !== 3}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <div style={{ gridColumnStart: "1", gridColumnEnd: "5" }}>
        <MoveHistoryTable
          moveHistory={moveHistory}
          creatorStarts={creatorStarts}
          handleViewMove={handleViewMove}
          viewIndex={viewIndex}
          height={moveHistoryHeight}
          menuTheme={menuTheme}
          boardTheme={boardTheme}
          isDarkModeOn={isDarkModeOn}
        />
      </div>
      <IconButton
        icon={"fast_rewind"}
        onClick={handleSeeFirstMove}
        disabled={lifeCycleStage <= 1 || viewIndex === 0}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"navigate_before"}
        onClick={handleSeePreviousMove}
        disabled={lifeCycleStage <= 1 || viewIndex === 0}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"navigate_next"}
        onClick={handleSeeNextMove}
        disabled={lifeCycleStage <= 1 || viewIndex === turnCount}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"fast_forward"}
        onClick={handleSeeLastMove}
        disabled={lifeCycleStage <= 1 || viewIndex === turnCount}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={isVolumeOn ? "volume_up" : "volume_off"}
        tooltip={
          isVolumeOn ? "Turn off sound effects" : "Turn on sound effects"
        }
        onClick={handleToggleVolume}
        disabled={isSpectator}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"zoom_out"}
        tooltip={"Decrease board size"}
        onClick={handleDecreaseBoardSize}
        disabled={zoomLevel === 0}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"zoom_in"}
        tooltip={"Increase board size"}
        onClick={handleIncreaseBoardSize}
        disabled={zoomLevel === 10}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon="home"
        tooltip="Return to lobby"
        onClick={handleLeaveGame}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
    </div>
  );
}
