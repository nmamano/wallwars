import { IconButtonWithDialog, IconButtonWithTooltip } from "../shared/Buttons";
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

  // All game functions are disabled for spectator and uploaded.
  const isSpectator = clientRole === RoleEnum.spectator;
  const isUploaded = clientRole === RoleEnum.uploaded;

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
      <IconButtonWithDialog
        icon={"flag"}
        tooltip={"Resign"}
        disabled={isSpectator || isUploaded || isPuzzle || lifeCycleStage !== 3}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        modalTitle={"Resign"}
        modalBody={"Are you sure you want to resign?"}
        modalConfirmButtonText={"Resign"}
        onClick={handleResign}
      />
      <IconButtonWithDialog
        icon={"local_florist"}
        tooltip={"Offer Draw"}
        disabled={
          isSpectator ||
          isUploaded ||
          isPuzzle ||
          !isOpponentPresent ||
          lifeCycleStage !== 3
        }
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        modalTitle={"Offer Draw"}
        modalBody={"Are you sure you want to offer a draw?"}
        modalConfirmButtonText={"Offer draw"}
        onClick={handleOfferDraw}
      />
      <IconButtonWithTooltip
        icon={"replay"}
        tooltip={"Request takeback"}
        disabled={
          isSpectator ||
          isUploaded ||
          isPuzzle ||
          !isOpponentPresent ||
          !takebackEnabled
        }
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleRequestTakeback}
      />
      <IconButtonWithTooltip
        icon={"add_alarm"}
        tooltip={"Give 60 seconds"}
        disabled={isSpectator || isUploaded || isPuzzle || lifeCycleStage !== 3}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleGiveExtraTime}
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
      <IconButtonWithTooltip
        icon={"fast_rewind"}
        tooltip={"Go to first move"}
        disabled={lifeCycleStage <= 1 || viewIndex === 0}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleSeeFirstMove}
      />
      <IconButtonWithTooltip
        icon={"navigate_before"}
        tooltip={"Go to previous move"}
        disabled={lifeCycleStage <= 1 || viewIndex === 0}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleSeePreviousMove}
      />
      <IconButtonWithTooltip
        icon={"navigate_next"}
        tooltip={"Go to next move"}
        disabled={lifeCycleStage <= 1 || viewIndex === turnCount}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleSeeNextMove}
      />
      <IconButtonWithTooltip
        icon={"fast_forward"}
        tooltip={"Go to last move"}
        disabled={lifeCycleStage <= 1 || viewIndex === turnCount}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleSeeLastMove}
      />
      <IconButtonWithTooltip
        icon={isVolumeOn ? "volume_up" : "volume_off"}
        tooltip={
          isVolumeOn ? "Turn off sound effects" : "Turn on sound effects"
        }
        disabled={isSpectator}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleToggleVolume}
      />
      <IconButtonWithTooltip
        icon={"zoom_out"}
        tooltip={"Decrease board size"}
        disabled={zoomLevel === 0}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleDecreaseBoardSize}
      />
      <IconButtonWithTooltip
        icon={"zoom_in"}
        tooltip={"Increase board size"}
        disabled={zoomLevel === 10}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleIncreaseBoardSize}
      />
      <IconButtonWithTooltip
        icon="home"
        tooltip="Return to lobby"
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleLeaveGame}
      />
    </div>
  );
}
