import React from "react";
import MoveHistory from "./MoveHistory";
import ControlPanelButton from "./ControlPanelButton";

const GameControlPanel = ({
  height,
  lifeCycleStage,
  handleResign,
  handleOfferDraw,
  handleProposeTakeback,
  handleIncreaseOpponentTime,
  moveHistory,
  playerColors,
  creatorStarts,
  handleViewMove,
  viewIndex,
  handleSeeFirstMove,
  handleSeePreviousMove,
  handleSeeNextMove,
  handleSeeLastMove,
  handleToggleVolume,
  isVolumeOn,
  handleToggleDarkMode,
  isDarkModeOn,
  handleIncreaseBoardSize,
  handleDecreaseBoardSize,
}) => {
  const padding = 5;
  const gapHeight = 5;
  const buttonHeight = 36;
  const moveHistoryHeight =
    height - buttonHeight * 3 - gapHeight * 3 - padding * 2;
  const disableUnimplemented = true;
  return (
    <div
      className="teal darken-2"
      style={{
        width: "100%",
        height: height,
        display: "grid",
        padding: `${padding}px`,
        marginLeft: "2.2rem",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: `${buttonHeight}px ${moveHistoryHeight}px ${buttonHeight}px ${buttonHeight}px`,
        columnGap: `${gapHeight}px`,
        rowGap: `${gapHeight}px`,
      }}
    >
      <ControlPanelButton
        icon={"flag"}
        tooltip={"Resign"}
        onClick={handleResign}
        confirmQuestion={"Are you sure you want to resign?"}
        confirmOption={"Resign"}
        disabled={lifeCycleStage !== 3}
      />
      <ControlPanelButton
        icon={"local_florist"}
        tooltip={"Offer Draw"}
        onClick={handleOfferDraw}
        confirmQuestion={"Are you sure you want to offer a draw?"}
        confirmOption={"Offer draw"}
        disabled={disableUnimplemented || lifeCycleStage !== 3}
      />
      <ControlPanelButton
        icon={"replay"}
        tooltip={"Propose takeback"}
        onClick={handleProposeTakeback}
        disabled={disableUnimplemented || lifeCycleStage !== 3}
      />
      <ControlPanelButton
        icon={"add_alarm"}
        tooltip={"Give 60 seconds"}
        onClick={handleIncreaseOpponentTime}
        disabled={disableUnimplemented || lifeCycleStage !== 3}
      />
      <div style={{ gridColumnStart: "1", gridColumnEnd: "5" }}>
        <MoveHistory
          height={moveHistoryHeight}
          moveHistory={moveHistory}
          playerColors={playerColors}
          creatorStarts={creatorStarts}
          handleViewMove={handleViewMove}
          viewIndex={viewIndex}
        />
      </div>
      <ControlPanelButton
        icon={"fast_rewind"}
        onClick={handleSeeFirstMove}
        disabled={lifeCycleStage <= 1}
      />
      <ControlPanelButton
        icon={"navigate_before"}
        onClick={handleSeePreviousMove}
        disabled={lifeCycleStage <= 1}
      />
      <ControlPanelButton
        icon={"navigate_next"}
        onClick={handleSeeNextMove}
        disabled={lifeCycleStage <= 1}
      />
      <ControlPanelButton
        icon={"fast_forward"}
        onClick={handleSeeLastMove}
        disabled={lifeCycleStage <= 1}
      />
      <ControlPanelButton
        icon={isVolumeOn ? "volume_up" : "volume_off"}
        tooltip={
          isVolumeOn ? "Turn off sound effects" : "Turn on sound effects"
        }
        onClick={handleToggleVolume}
      />
      <ControlPanelButton
        icon={isDarkModeOn ? "brightness_2" : "brightness_4"}
        tooltip={isDarkModeOn ? "Turn off dark mode" : "Turn on dark mode"}
        onClick={handleToggleDarkMode}
        disabled={disableUnimplemented}
      />
      <ControlPanelButton
        icon={"zoom_in"}
        tooltip={"Increase board size"}
        onClick={handleIncreaseBoardSize}
        disabled={disableUnimplemented}
      />
      <ControlPanelButton
        icon={"zoom_out"}
        tooltip={"Decrease board size"}
        onClick={handleDecreaseBoardSize}
        disabled={disableUnimplemented}
      />
    </div>
  );
};

export default GameControlPanel;
