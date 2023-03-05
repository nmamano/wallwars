import * as React from "react";
import { useEffect } from "react";
import Grid from "@mui/material/Grid";
import { getColor } from "../shared/colorThemes";
import showToastNotification from "../shared/showToastNotification";
import {
  TextButton,
  IconButtonWithTooltip,
  IconButtonWithInfoModal,
} from "../shared/Buttons";
import { maxBoardDims } from "../shared/globalSettings";
import { eloIdAboutText } from "./lobbyHelp";
import { ClientParams, PosSetting } from "./LobbyPage";
import TokenDropdown from "./TokenDropdown";
import TextInputField from "../shared/TextInputField";
import Checkbox from "@mui/material/Checkbox";
import { FormControlLabel } from "@mui/material";
import CoordinateSelector from "../shared/CoordinateSelector";
import {
  internalToClassicBoardSize,
  classicToInternalBoardSize,
  internalToClassicCoord,
  classicToInternalCoord,
} from "../shared/gameLogicUtils";

export default function LobbyForm({
  clientParams,
  isLargeScreen,
  handlePlayerName,
  handleDuration,
  handleIncrement,
  handleIsPrivate,
  handleNumRows,
  handleNumCols,
  handleShowMoreOptions,
  handleStartPos,
  handleGoalPos,
  handleJoinCode,
  handleCreateGame,
  handleJoinGame,
  handleLocalGame,
  handleComputerGame,
  handleRefreshName,
  handleToken,
  handleEloId,
}: {
  clientParams: ClientParams;
  isLargeScreen: boolean;
  handlePlayerName: (name: string) => void;
  handleDuration: (duration: string) => void;
  handleIncrement: (increment: string) => void;
  handleIsPrivate: (isPrivate: boolean) => void;
  handleNumRows: (numRows: number) => void;
  handleNumCols: (numCols: number) => void;
  handleShowMoreOptions: (showMoreOptions: boolean) => void;
  handleStartPos: (startPos: PosSetting) => void;
  handleGoalPos: (goalPos: PosSetting) => void;
  handleJoinCode: (joinCode: string) => void;
  handleCreateGame: () => void;
  handleJoinGame: () => void;
  handleLocalGame: () => void;
  handleComputerGame: () => void;
  handleRefreshName: () => void;
  handleToken: (token: string) => void;
  handleEloId: (eloId: string) => void;
}): JSX.Element {
  const menuTheme = clientParams.menuTheme;
  const isDarkModeOn = clientParams.isDarkModeOn;
  const showMoreOptions = clientParams.showMoreOptions;
  const BS = clientParams.boardSettings;

  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  });
  const downHandler = ({ key }: { key: string }) => {
    if (key !== "Enter") return;
    if (clientParams.joinCode.length > 0) handleJoinGame();
    else {
      showToastNotification("Created new game", 5000);
      handleCreateGame();
    }
  };

  const defaultToken = (
    <div style={{ fontSize: "30px" }}>
      <i className={`material-icons white-text`} style={{ height: `100%` }}>
        face
      </i>
      {isLargeScreen ? " / " : "/"}
      <i className={`material-icons white-text`} style={{ height: `100%` }}>
        outlet
      </i>
    </div>
  );
  const customToken = (
    <span className={"white-text"} style={{ fontSize: "30px" }}>
      <i className={`material-icons white-text`} style={{ height: `100%` }}>
        {clientParams.token}
      </i>
    </span>
  );

  const gridItemStyle = {
    paddingLeft: "10px",
    paddingRight: "10px",
    paddingTop: "15px",
    paddingBottom: "15px",
  };
  const horizontalSep = <span style={{ paddingLeft: "20px" }}></span>;

  const [tokenDropdownAnchorEl, setTokenDropdownAnchorEl] =
    React.useState<null | HTMLElement>(null);

  // todo: the isInvalid prop in TextInputField could be used to highlight invalid inputs.

  return (
    <div
      style={{
        marginTop: "2rem",
        paddingBottom: "0.6rem",
        maxWidth: isLargeScreen ? "60%" : "80%",
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "left",
        backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
      }}
    >
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        textAlign="center"
        spacing={0}
      >
        <Grid item style={gridItemStyle} xs={4}>
          <TextButton
            text="Create Game"
            tooltip="Create challenge that others can join."
            onClick={handleCreateGame}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
        </Grid>
        <Grid item style={gridItemStyle} xs={4}>
          <TextButton
            text="Computer game"
            tooltip="Play offline versus the computer."
            onClick={handleComputerGame}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
        </Grid>
        <Grid item style={gridItemStyle} xs={4}>
          <TextButton
            text="Offline game"
            tooltip="Play offline as both players."
            onClick={handleLocalGame}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
        </Grid>
      </Grid>
      <div style={gridItemStyle}>
        <span style={gridItemStyle}>
          <TextInputField
            label="Your name:"
            id="nameInput"
            value={clientParams.playerName}
            onChange={handlePlayerName}
          />
        </span>
        <span style={gridItemStyle}>
          <IconButtonWithTooltip
            icon="refresh"
            tooltip="Get a new name"
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
            circular={true}
            onClick={handleRefreshName}
          />
        </span>
      </div>
      <div>
        <FormControlLabel
          style={{ color: "white" }}
          label="More settings:"
          labelPlacement="start"
          control={
            <Checkbox
              sx={{ color: "white", paddingLeft: "24px" }}
              checked={showMoreOptions}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                handleShowMoreOptions(event.target.checked);
              }}
              inputProps={{ "aria-label": "controlled" }}
            />
          }
        />
      </div>
      {showMoreOptions && (
        <>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                paddingLeft: "20px",
                paddingRight: "20px",
                fontSize: "20px",
              }}
            >
              {isLargeScreen ? "Your token:" : "Token:"}
            </span>
            {clientParams.token === "default" ? defaultToken : customToken}
            <span style={{ paddingLeft: "20px" }}></span>
            {TokenDropdown(
              tokenDropdownAnchorEl,
              setTokenDropdownAnchorEl,
              handleToken,
              menuTheme,
              isDarkModeOn
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: "20px",
            }}
          >
            {horizontalSep}
            <span
              style={{
                fontSize: "20px",
              }}
            >
              {isLargeScreen ? "Time control:" : "Time:"}
            </span>
            {horizontalSep}
            <TextInputField
              label={isLargeScreen ? "Duration (minutes):" : "Duration (m):"}
              id="durationInput"
              value={`${clientParams.timeControl.duration}`}
              onChange={handleDuration}
            />
            {horizontalSep}
            <TextInputField
              label={isLargeScreen ? "Increment (seconds):" : "Increment (s):"}
              id="incrementInput"
              value={`${clientParams.timeControl.increment}`}
              onChange={handleIncrement}
            />
          </div>
          <CoordinateSelector
            label={isLargeScreen ? "Board dimensions:" : "Board:"}
            labelWidth={isLargeScreen ? "170px" : "80px"}
            rowLabel="Rows:"
            colLabel="Columns:"
            row={BS.dims[0]}
            col={BS.dims[1]}
            rowMin={3}
            rowMax={maxBoardDims[0]}
            colMin={3}
            colMax={maxBoardDims[1]}
            handleRow={handleNumRows}
            handleCol={handleNumCols}
            ToDisplay={internalToClassicBoardSize}
            FromDisplay={classicToInternalBoardSize}
          />
          <CoordinateSelector
            label={isLargeScreen ? "Creator start:" : "P1 start:"}
            labelWidth={isLargeScreen ? "170px" : "80px"}
            row={BS.startPos[0][0]}
            col={BS.startPos[0][1]}
            rowMin={0}
            rowMax={BS.dims[0] - 1}
            colMin={0}
            colMax={BS.dims[1] - 1}
            handleRow={(val) => {
              handleStartPos({ player: 0, coord: 0, val });
            }}
            handleCol={(val) => {
              handleStartPos({ player: 0, coord: 1, val });
            }}
            ToDisplay={internalToClassicCoord}
            FromDisplay={classicToInternalCoord}
          />
          <CoordinateSelector
            label={isLargeScreen ? "Joiner start:" : "P2 start:"}
            labelWidth={isLargeScreen ? "170px" : "80px"}
            row={BS.startPos[1][0]}
            col={BS.startPos[1][1]}
            rowMin={0}
            rowMax={BS.dims[0] - 1}
            colMin={0}
            colMax={BS.dims[1] - 1}
            handleRow={(val) => {
              handleStartPos({ player: 1, coord: 0, val });
            }}
            handleCol={(val) => {
              handleStartPos({ player: 1, coord: 1, val });
            }}
            ToDisplay={internalToClassicCoord}
            FromDisplay={classicToInternalCoord}
          />
          <CoordinateSelector
            label={isLargeScreen ? "Creator goal:" : "P1 goal:"}
            labelWidth={isLargeScreen ? "170px" : "80px"}
            row={BS.goalPos[0][0]}
            col={BS.goalPos[0][1]}
            rowMin={0}
            rowMax={BS.dims[0] - 1}
            colMin={0}
            colMax={BS.dims[1] - 1}
            handleRow={(val) => {
              handleGoalPos({ player: 0, coord: 0, val });
            }}
            handleCol={(val) => {
              handleGoalPos({ player: 0, coord: 1, val });
            }}
            ToDisplay={internalToClassicCoord}
            FromDisplay={classicToInternalCoord}
          />
          <CoordinateSelector
            label={isLargeScreen ? "Joiner goal:" : "P2 goal:"}
            labelWidth={isLargeScreen ? "170px" : "80px"}
            row={BS.goalPos[1][0]}
            col={BS.goalPos[1][1]}
            rowMin={0}
            rowMax={BS.dims[0] - 1}
            colMin={0}
            colMax={BS.dims[1] - 1}
            handleRow={(val) => {
              handleGoalPos({ player: 1, coord: 0, val });
            }}
            handleCol={(val) => {
              handleGoalPos({ player: 1, coord: 1, val });
            }}
            ToDisplay={internalToClassicCoord}
            FromDisplay={classicToInternalCoord}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: "20px",
            }}
          >
            {horizontalSep}
            <span
              style={{
                fontSize: "20px",
              }}
            >
              ELO id:
            </span>
            {horizontalSep}
            <TextInputField
              label=""
              id="eloIdInput"
              value={clientParams.eloId}
              onChange={handleEloId}
            />
            {horizontalSep}
            <IconButtonWithInfoModal
              icon="info"
              tooltip="About ELO ids"
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
              circular={true}
              modalTitle="About ELO ids"
              modalBody={eloIdAboutText}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              paddingTop: "20px",
            }}
          >
            {horizontalSep}
            <span
              style={{
                fontSize: "20px",
              }}
            >
              Private game:
            </span>
            {horizontalSep}
            <TextInputField
              id="joinInput"
              label=""
              value={`${clientParams.joinCode}`}
              onChange={handleJoinCode}
              placeholder="Write game code here..."
            />
            {horizontalSep}
            <TextButton
              text="Join Game"
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
              disabled={clientParams.joinCode === ""}
              onClick={handleJoinGame}
            />
          </div>
          <div style={gridItemStyle}>
            <FormControlLabel
              control={
                <Checkbox
                  id="isPrivateCheckbox"
                  sx={{ color: "white", paddingLeft: "24px" }}
                  checked={clientParams.isPrivate}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    handleIsPrivate(event.target.checked);
                  }}
                  inputProps={{ "aria-label": "controlled" }}
                />
              }
              label="Create Private Games"
              style={{ color: "white" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
