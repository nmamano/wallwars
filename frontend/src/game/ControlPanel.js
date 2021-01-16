import React from "react";

import MoveHistory from "./MoveHistory";
import IconButton from "./../shared/IconButton";
import showToastNotification from "../shared/showToastNotification";
import { getColor } from "../shared/colorThemes";

const GameControlPanel = ({
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
}) => {
  const padding = 5;
  const gapHeight = 5;
  const buttonHeight = 36;
  const moveHistoryHeight =
    controlPanelHeight - buttonHeight * 3 - gapHeight * 3 - padding * 2;

  const takebackEnabled =
    lifeCycleStage === 3 ||
    (lifeCycleStage === 2 && creatorStarts === (clientRole === "creator"));

  //all game functions are disabled for spectator
  const isSpectator = clientRole === "spectator";

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
        disabled={isSpectator || lifeCycleStage !== 3}
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
        disabled={isSpectator || !isOpponentPresent || lifeCycleStage !== 3}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"replay"}
        tooltip={"Request takeback"}
        onClick={() => {
          showToastNotification(
            "A takeback request was sent to the opponent.",
            5000
          );
          handleRequestTakeback();
        }}
        disabled={isSpectator || !isOpponentPresent || !takebackEnabled}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <IconButton
        icon={"add_alarm"}
        tooltip={"Give 60 seconds"}
        onClick={() => {
          showToastNotification("You added 60s to the opponent's clock.", 5000);
          handleGiveExtraTime();
        }}
        disabled={isSpectator || lifeCycleStage !== 3}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
      />
      <div style={{ gridColumnStart: "1", gridColumnEnd: "5" }}>
        <MoveHistory
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
};

export default GameControlPanel;
