import React from "react";
import MoveHistory from "./MoveHistory";
import IconButton from "./../shared/IconButton";
import showToastNotification from "../shared/showToastNotification";

const GameControlPanel = ({
  lifeCycleStage,
  handleResign,
  handleOfferDraw,
  handleRequestTakeback,
  handleGiveExtraTime,
  moveHistory,
  playerColors,
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
  boardHeight,
}) => {
  const padding = 5;
  const gapHeight = 5;
  const buttonHeight = 36;
  const moveHistoryHeight =
    boardHeight - buttonHeight * 3 - gapHeight * 3 - padding * 2;

  const takebackEnabled =
    lifeCycleStage === 3 ||
    (lifeCycleStage === 2 && creatorStarts === (clientRole === "Creator"));

  //all game functions are disabled for spectator
  const isSpectator = clientRole === "Spectator";

  return (
    <div
      className="teal darken-2"
      style={{
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
      />
      <IconButton
        icon={"local_florist"}
        tooltip={"Offer Draw"}
        modalTitle={"Offer Draw"}
        modalBody={"Are you sure you want to offer a draw?"}
        modalConfirmButtonText={"Offer draw"}
        onClick={handleOfferDraw}
        disabled={isSpectator || lifeCycleStage !== 3}
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
        disabled={isSpectator || !takebackEnabled}
      />
      <IconButton
        icon={"add_alarm"}
        tooltip={"Give 60 seconds"}
        onClick={() => {
          showToastNotification("You added 60s to the opponent's clock.", 5000);
          handleGiveExtraTime();
        }}
        disabled={isSpectator || lifeCycleStage !== 3}
      />
      <div style={{ gridColumnStart: "1", gridColumnEnd: "5" }}>
        <MoveHistory
          moveHistory={moveHistory}
          playerColors={playerColors}
          creatorStarts={creatorStarts}
          handleViewMove={handleViewMove}
          viewIndex={viewIndex}
          height={moveHistoryHeight}
        />
      </div>
      <IconButton
        icon={"fast_rewind"}
        onClick={handleSeeFirstMove}
        disabled={lifeCycleStage <= 1 || viewIndex === 0}
      />
      <IconButton
        icon={"navigate_before"}
        onClick={handleSeePreviousMove}
        disabled={lifeCycleStage <= 1 || viewIndex === 0}
      />
      <IconButton
        icon={"navigate_next"}
        onClick={handleSeeNextMove}
        disabled={lifeCycleStage <= 1 || viewIndex === turnCount}
      />
      <IconButton
        icon={"fast_forward"}
        onClick={handleSeeLastMove}
        disabled={lifeCycleStage <= 1 || viewIndex === turnCount}
      />
      <IconButton
        icon={isVolumeOn ? "volume_up" : "volume_off"}
        tooltip={
          isVolumeOn ? "Turn off sound effects" : "Turn on sound effects"
        }
        onClick={handleToggleVolume}
        disabled={isSpectator}
      />
      <IconButton
        icon={"zoom_out"}
        tooltip={"Decrease board size"}
        onClick={handleDecreaseBoardSize}
        disabled={zoomLevel === 0}
      />
      <IconButton
        icon={"zoom_in"}
        tooltip={"Increase board size"}
        onClick={handleIncreaseBoardSize}
        disabled={zoomLevel === 10}
      />
      <IconButton
        icon="home"
        tooltip="Quit game"
        onClick={handleLeaveGame}
        modalTitle="Return to lobby"
        modalBody="Are you sure you want to return to the lobby?"
        modalConfirmButtonText="Quit game"
      />
    </div>
  );
};

export default GameControlPanel;
