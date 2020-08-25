import React from "react";
import "materialize-css";
import { CopyToClipboard } from "react-copy-to-clipboard";
import "react-toastify/dist/ReactToastify.css";

import IconButton from "./IconButton";
import showToastNotification from "./showToastNotification";
import { getColor } from "./colorThemes";

function Header({
  context, //Player, Spectator, or Lobby
  helpText,
  aboutText,
  joinCode,
  handleLeaveGame,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleToggleDarkMode,
  handleToggleTheme,
}) {
  let mainText;
  if (context === "Lobby") {
    mainText = <span>WallWars</span>;
  } else if (context === "Spectator") {
    mainText = (
      <span style={{ cursor: "pointer" }} onClick={handleLeaveGame}>
        WallWars
      </span>
    );
  } else {
    mainText = (
      <span>
        {isLargeScreen && (
          <span style={{ cursor: "pointer" }} onClick={handleLeaveGame}>
            WallWars
          </span>
        )}
        {isLargeScreen && <span>&nbsp;</span>}
        <CopyToClipboard
          style={{ cursor: "pointer" }}
          text={joinCode}
          onCopy={() => showToastNotification("Join code copied to clipboard!")}
        >
          <span>Code {joinCode}</span>
        </CopyToClipboard>
      </span>
    );
  }
  const padding = isLargeScreen ? 20 : 11;
  const buttonCol = getColor(menuTheme, "headerButton", isDarkModeOn);
  return (
    <div>
      <div
        style={{
          height: "50px",
          display: "grid",
          gridTemplateRows: "1fr",
          gridTemplateColumns: "auto auto",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: getColor(menuTheme, "header", isDarkModeOn),
        }}
      >
        <div
          style={{
            fontSize: isLargeScreen ? "30px" : "25px",
            marginLeft: isLargeScreen ? "15px" : "5px",
          }}
        >
          {mainText}
        </div>
        <div
          style={{
            height: "auto",
            display: "grid",
            padding: "5px",
            gridTemplateColumns: `repeat(${isLargeScreen ? 4 : 3}, 1fr)`,
            gridTemplateRows: `auto`,
            columnGap: "5px",
            rowGap: "5px",
            marginRight: isLargeScreen ? "15px" : "5px",
          }}
        >
          {isLargeScreen && (
            <IconButton
              icon={"color_lens"}
              tooltip={"Change theme"}
              onClick={handleToggleTheme}
              bgColor={buttonCol}
              padding={padding}
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
            />
          )}
          <IconButton
            icon={isDarkModeOn ? "wb_sunny" : "brightness_2"}
            tooltip={
              isDarkModeOn ? "Turn off night mode" : "Turn on night mode"
            }
            onClick={handleToggleDarkMode}
            bgColor={buttonCol}
            padding={padding}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
          <IconButton
            icon="help"
            tooltip="Help"
            modalTitle="Help"
            modalBody={helpText}
            bgColor={buttonCol}
            padding={padding}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
          {context === "Lobby" && (
            <IconButton
              icon="info"
              tooltip="About"
              modalTitle="About"
              modalBody={aboutText}
              bgColor={buttonCol}
              padding={padding}
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
            />
          )}
          {context !== "Lobby" && (
            <IconButton
              icon="home"
              tooltip="Leave game"
              onClick={handleLeaveGame}
              bgColor={buttonCol}
              padding={padding}
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;
