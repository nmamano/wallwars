import "materialize-css";
import { CopyToClipboard } from "react-copy-to-clipboard";
import "react-toastify/dist/ReactToastify.css";
import { IconButtonWithTooltip, IconButtonWithInfoModal } from "./Buttons";
import showToastNotification from "./showToastNotification";
import { getColor, MenuThemeName } from "./colorThemes";

function UsernameLabel({ playerName }: { playerName: String }): JSX.Element {
  return (
    <div
      style={{
        height: "2.5rem",
        width: "auto",
        maxWidth: "12rem",
        paddingLeft: "0.5rem",
        paddingRight: "0.5rem",
        marginRight: "5px",
        borderRadius: "5px",
        border: "1px",
        borderColor: "white",
        borderStyle: "solid",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        cursor: "default",
      }}
    >
      <p
        style={{
          color: "white",
          fontSize: "20px",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {playerName}
      </p>
    </div>
  );
}

const contextEnum = {
  player: "player",
  spectator: "spectator",
  lobby: "lobby",
  profile: "profile",
};

function Header({
  context,
  helpText,
  aboutText,
  joinCode,
  handleReturnToLobby,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  isLoggedIn,
  playerName,
  handleToggleDarkMode,
  handleToggleTheme,
  handleLogin,
  handleGoToProfile,
}: {
  context: "lobby" | "player" | "spectator" | "profile";
  helpText: JSX.Element;
  aboutText?: JSX.Element;
  joinCode?: string;
  handleReturnToLobby?: () => void;
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  isLoggedIn: boolean;
  playerName: string;
  handleToggleDarkMode: () => void;
  handleToggleTheme: () => void;
  handleLogin?: () => void; // Undefined in the game page.
  handleGoToProfile?: () => void; // Undefined in the game page.
}): JSX.Element {
  const hasJoinCode =
    joinCode !== undefined &&
    joinCode !== "local" &&
    joinCode !== "puzzle" &&
    joinCode !== "AI" &&
    joinCode !== "Uploaded";
  let mainText;
  if (context === contextEnum.lobby || context === contextEnum.profile) {
    mainText = <span>WallWars</span>;
  } else if (context === contextEnum.spectator) {
    mainText = (
      <span style={{ cursor: "pointer" }} onClick={handleReturnToLobby}>
        WallWars
      </span>
    );
  } else {
    mainText = (
      <span>
        {(isLargeScreen || !hasJoinCode) && (
          <span style={{ cursor: "pointer" }} onClick={handleReturnToLobby}>
            WallWars
          </span>
        )}
        {isLargeScreen && <span>&nbsp;</span>}
        {hasJoinCode && (
          <CopyToClipboard
            // @ts-ignore
            style={{ cursor: "pointer" }}
            // @ts-ignore
            text={joinCode}
            onCopy={() =>
              showToastNotification("Join code copied to clipboard!")
            }
          >
            <span>Code {joinCode}</span>
          </CopyToClipboard>
        )}
      </span>
    );
  }
  const padding = isLargeScreen ? 20 : 11;
  const buttonCol = getColor(menuTheme, "headerButton", isDarkModeOn);

  // Night mode, help, login, and lobby info OR return to lobby buttons.
  let buttonCount = 4;
  // The "change theme" button is only shown in large screens
  if (isLargeScreen) buttonCount++;

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
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              height: "auto",
              display: "grid",
              gridTemplateColumns: `repeat(${buttonCount}, 1fr)`,
              gridTemplateRows: `auto`,
              columnGap: "5px",
              rowGap: "5px",
              marginRight: "5px",
            }}
          >
            {isLargeScreen && (
              <IconButtonWithTooltip
                icon={"color_lens"}
                tooltip={"Change theme"}
                bgColor={buttonCol}
                horizontalPadding={padding}
                onClick={handleToggleTheme}
              />
            )}
            <IconButtonWithTooltip
              icon={isDarkModeOn ? "wb_sunny" : "brightness_2"}
              tooltip={
                isDarkModeOn ? "Turn off night mode" : "Turn on night mode"
              }
              bgColor={buttonCol}
              horizontalPadding={padding}
              onClick={handleToggleDarkMode}
            />
            <IconButtonWithInfoModal
              icon="help"
              tooltip="Help"
              bgColor={buttonCol}
              horizontalPadding={padding}
              modalTitle="Help"
              modalBody={helpText}
            />
            <IconButtonWithTooltip
              icon={isLoggedIn ? "account_circle" : "account_circle_outlined"}
              tooltip={isLoggedIn ? "Profile" : "Log in"}
              bgColor={buttonCol}
              horizontalPadding={padding}
              onClick={isLoggedIn ? handleGoToProfile! : handleLogin!}
            />
            {context === contextEnum.lobby && (
              <IconButtonWithInfoModal
                icon="info"
                tooltip="About"
                bgColor={buttonCol}
                horizontalPadding={padding}
                modalTitle="About"
                modalBody={aboutText!}
              />
            )}
            {context !== contextEnum.lobby && (
              <IconButtonWithTooltip
                icon="home"
                tooltip="Return to lobby"
                bgColor={buttonCol}
                horizontalPadding={padding}
                onClick={handleReturnToLobby!}
              />
            )}
          </div>
          <UsernameLabel playerName={playerName} />
        </div>
      </div>
    </div>
  );
}

export default Header;
