import * as React from "react";
import { useEffect } from "react";
import Grid from "@mui/material/Grid";
import { getColor } from "../shared/colorThemes";
import showToastNotification from "../shared/showToastNotification";
import { TextButton, TextButtonWithTextField } from "../shared/Buttons";
import { maxBoardDims } from "../shared/globalSettings";
import { AppState, PosSetting } from "../App";
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
  appState,
  isLargeScreen,
  showMoreOptions,
  inputtedDuration,
  inputtedIncrement,
  handlePlayerName,
  handleInputtedDuration,
  handleInputtedIncrement,
  handleIsPrivate,
  handleNumRows,
  handleNumCols,
  handleShowMoreOptions,
  handlePosSetting,
  handleJoinCode,
  handleCreateGame,
  handleJoinGame,
  handleLocalGame,
  handleComputerGame,
  handleToken,
}: {
  appState: AppState;
  isLargeScreen: boolean;
  showMoreOptions: boolean;
  inputtedDuration: string;
  inputtedIncrement: string;
  handlePlayerName: (name: string) => void;
  handleInputtedDuration: (duration: string) => void;
  handleInputtedIncrement: (increment: string) => void;
  handleIsPrivate: (isPrivate: boolean) => void;
  handleNumRows: (numRows: number) => void;
  handleNumCols: (numCols: number) => void;
  handleShowMoreOptions: (showMoreOptions: boolean) => void;
  handlePosSetting: (posSetting: PosSetting) => void;
  handleJoinCode: (joinCode: string) => void;
  handleCreateGame: (strDur: string, strInc: string) => void;
  handleJoinGame: () => void;
  handleLocalGame: (strDur: string, strInc: string) => void;
  handleComputerGame: () => void;
  handleToken: (token: string) => void;
}): JSX.Element {
  const menuTheme = appState.menuTheme;
  const isDarkModeOn = appState.isDarkModeOn;
  const BS = appState.boardSettings;

  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  });
  const downHandler = ({ key }: { key: string }) => {
    if (key !== "Enter") return;
    if (appState.joinCode.length > 0) handleJoinGame();
    else {
      showToastNotification("Created new game", 5000);
      handleCreateGame(inputtedDuration, inputtedIncrement);
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
        {appState.token}
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

  const isLoggedIn = appState.idToken !== "";

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
            onClick={() =>
              handleCreateGame(inputtedDuration, inputtedIncrement)
            }
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
            onClick={() => handleLocalGame(inputtedDuration, inputtedIncrement)}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
        </Grid>
      </Grid>
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        textAlign="center"
        spacing={0}
      >
        <Grid item style={gridItemStyle} xs={4}>
          <div style={gridItemStyle}>
            <TextButtonWithTextField
              baseButtonText="Change Name"
              tooltip={
                isLoggedIn ? "Change your name." : "Log in to change your name."
              }
              disabled={!isLoggedIn}
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
              modalTitle="Name change"
              modalBody="Enter your new name:"
              onClick={handlePlayerName}
            />
          </div>
        </Grid>
      </Grid>
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
            {appState.token === "default" ? defaultToken : customToken}
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
              value={`${inputtedDuration}`}
              onChange={handleInputtedDuration}
            />
            {horizontalSep}
            <TextInputField
              label={isLargeScreen ? "Increment (seconds):" : "Increment (s):"}
              id="incrementInput"
              value={`${inputtedIncrement}`}
              onChange={handleInputtedIncrement}
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
              handlePosSetting({
                player: "creator",
                coord: "row",
                posType: "start",
                val,
              });
            }}
            handleCol={(val) => {
              handlePosSetting({
                player: "creator",
                coord: "col",
                posType: "start",
                val,
              });
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
              handlePosSetting({
                player: "joiner",
                coord: "row",
                posType: "start",
                val,
              });
            }}
            handleCol={(val) => {
              handlePosSetting({
                player: "joiner",
                coord: "col",
                posType: "start",
                val,
              });
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
              handlePosSetting({
                player: "creator",
                coord: "row",
                posType: "goal",
                val,
              });
            }}
            handleCol={(val) => {
              handlePosSetting({
                player: "creator",
                coord: "col",
                posType: "goal",
                val,
              });
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
              handlePosSetting({
                player: "joiner",
                coord: "row",
                posType: "goal",
                val,
              });
            }}
            handleCol={(val) => {
              handlePosSetting({
                player: "joiner",
                coord: "col",
                posType: "goal",
                val,
              });
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
              Private game:
            </span>
            {horizontalSep}
            <TextInputField
              id="joinInput"
              label=""
              value={`${appState.joinCode}`}
              onChange={handleJoinCode}
              placeholder="Write game code here..."
            />
            {horizontalSep}
            <TextButton
              text="Join Game"
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
              disabled={appState.joinCode === ""}
              onClick={handleJoinGame}
            />
          </div>
          <div style={gridItemStyle}>
            <FormControlLabel
              control={
                <Checkbox
                  id="isPrivateCheckbox"
                  sx={{ color: "white", paddingLeft: "24px" }}
                  checked={appState.isPrivate}
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
