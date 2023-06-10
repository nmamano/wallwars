import { AppState } from "../App";
import Header from "../shared/Header";
import { profileHelpText } from "./profileHelp";
import ProfileForm from "./ProfileForm";

export default function ProfilePage({
  appState,
  isLargeScreen,
  handleToggleTheme,
  handleToggleDarkMode,
  handleReturnToLobby,
  handleLogin,
  handlePlayerName,
  handleToken,
}: {
  appState: AppState;
  isLargeScreen: boolean;
  handleToggleTheme: () => void;
  handleToggleDarkMode: () => void;
  handleReturnToLobby: () => void;
  handleLogin: () => void;
  handlePlayerName: (name: string) => void;
  handleToken: (token: string) => void;
}): JSX.Element {
  return (
    <div
      style={{
        paddingBottom: "2rem",
      }}
    >
      <Header
        context={"profile"}
        isLargeScreen={isLargeScreen}
        menuTheme={appState.menuTheme}
        isDarkModeOn={appState.isDarkModeOn}
        helpText={profileHelpText}
        handleToggleDarkMode={handleToggleDarkMode}
        handleToggleTheme={handleToggleTheme}
        isLoggedIn={appState.idToken !== ""}
        handleLogin={handleLogin}
        playerName={appState.playerName}
        handleReturnToLobby={handleReturnToLobby}
      />
      <ProfileForm
        appState={appState}
        isLargeScreen={isLargeScreen}
        handlePlayerName={handlePlayerName}
        handleToken={handleToken}
      />
    </div>
  );
}
