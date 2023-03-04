import "materialize-css";
import { CopyToClipboard } from "react-copy-to-clipboard";
import "react-toastify/dist/ReactToastify.css";
import { IconButtonWithTooltip, IconButtonWithInfoModal } from "./Buttons";
import showToastNotification from "./showToastNotification";
import { getColor, MenuThemeName } from "./colorThemes";
import AuthButton from "./AuthButton";

const contextEnum = {
  player: "player",
  spectator: "spectator",
  lobby: "lobby",
};

function Header({
  context,
  helpText,
  aboutText,
  joinCode,
  handleLeaveGame,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleToggleDarkMode,
  handleToggleTheme,
}: {
  context: string;
  helpText: JSX.Element;
  aboutText?: JSX.Element;
  joinCode?: string;
  handleLeaveGame?: () => void;
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  handleToggleDarkMode: () => void;
  handleToggleTheme: () => void;
}): JSX.Element {
  let mainText;
  if (context === contextEnum.lobby) {
    mainText = <span>WallWars</span>;
  } else if (context === contextEnum.spectator) {
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
          // @ts-ignore
          style={{ cursor: "pointer" }}
          // @ts-ignore
          text={joinCode}
          onCopy={() => showToastNotification("Join code copied to clipboard!")}
        >
          {/* Todo: do not show "Code" for local AI, and puzzle games */}
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
            gridTemplateColumns: `repeat(${isLargeScreen ? 5 : 4}, 1fr)`,
            gridTemplateRows: `auto`,
            columnGap: "5px",
            rowGap: "5px",
            marginRight: isLargeScreen ? "15px" : "5px",
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
              tooltip="Leave game"
              bgColor={buttonCol}
              horizontalPadding={padding}
              onClick={handleLeaveGame!}
            />
          )}
          <AuthButton
            bgColor={buttonCol}
            padding={padding}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          ></AuthButton>
        </div>
      </div>
    </div>
  );
}

export default Header;
