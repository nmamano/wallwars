import { useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import { useImmer } from "use-immer";
import { randPlayerName } from "../shared/utils";
import { getColor } from "../shared/colorThemes";
import { maxBoardDims, cellSizes } from "../shared/globalSettings";
import LobbyForm from "./LobbyForm";
import LobbyTabs from "./LobbyTabs";
import RankingList from "./RankingList";
import PuzzleList from "./PuzzleList";
import GameShowcase from "./GameShowcase";
import Header from "../shared/Header";
import { lobbyHelpText, aboutText } from "./lobbyHelp";
import { boardPixelDims, TimeControl } from "../shared/gameLogicUtils";
import { TextButton } from "../shared/Buttons";
import { AppState, PosSetting } from "../App";
import socket from "../socket";

export type LobbyState = {
  // These are the duration and increment as free form strings. They are not validated and converted
  // into numbers until the user creates a game.
  inputtedDuration: string;
  inputtedIncrement: string;
  // Whether to show all the configuration options in the lobby form.
  showMoreOptions: boolean;
};

function initialLobbyState(tc: TimeControl): LobbyState {
  return {
    inputtedDuration: tc.duration.toString(),
    inputtedIncrement: tc.increment.toString(),
    showMoreOptions: false,
  };
}

export default function LobbyPage({
  appState,
  isLoggedIn,
  isLargeScreen,
  handleToggleTheme,
  handleToggleDarkMode,
  handlePlayerName,
  handleIdToken,
  handleToken,
  handleIsPrivate,
  handleNumRows,
  handleNumCols,
  handlePosSetting,
  handleJoinCode,
  handleCreateGame,
  handleJoinGame,
  handleAcceptChallenge,
  handleReturnToGame,
  handleViewGame,
  handleLocalGame,
  handleComputerGame,
  handleSolvePuzzle,
  handleHasOngoingGameInServer,
}: {
  appState: AppState;
  isLoggedIn: boolean;
  isLargeScreen: boolean;
  handleToggleTheme: () => void;
  handleToggleDarkMode: () => void;
  handlePlayerName: (name: string) => void;
  handleIdToken: (idToken: string) => void;
  handleToken: (token: string) => void;
  handleIsPrivate: (isPrivate: boolean) => void;
  handleNumRows: (nr: number) => void;
  handleNumCols: (nc: number) => void;
  handlePosSetting: (posSetting: PosSetting) => void;
  handleJoinCode: (joinCode: string) => void;
  handleCreateGame: (strDur: string, strInc: string) => void;
  handleJoinGame: () => void;
  handleAcceptChallenge: (joinCode: string) => void;
  handleReturnToGame: () => void;
  handleViewGame: (watchGameId: string) => void;
  handleLocalGame: (strDur: string, strInc: string) => void;
  handleComputerGame: () => void;
  handleSolvePuzzle: (puzzleId: string) => void;
  handleHasOngoingGameInServer: (hasOngoingGame: boolean) => void;
}): JSX.Element {
  const [state, updateState] = useImmer(
    initialLobbyState(appState.timeControl)
  );
  const handleInputtedDuration = (val: string) => {
    updateState((draftState) => {
      draftState.inputtedDuration = val;
    });
  };
  const handleInputtedIncrement = (val: string) => {
    updateState((draftState) => {
      draftState.inputtedIncrement = val;
    });
  };
  const handleShowMoreOptions = () => {
    updateState((draftState) => {
      draftState.showMoreOptions = !draftState.showMoreOptions;
    });
  };

  const handleRefreshName = () => {
    handlePlayerName(randPlayerName(30));
  };

  // Determine if the "Return To Game" button needs to be shown.
  useEffect(() => {
    if (!appState.hasOngoingGame) {
      socket.emit("checkHasOngoingGame", { idToken: appState.idToken });
    }
  }, [appState.hasOngoingGame, appState.idToken]);
  useEffect(() => {
    socket.on("respondHasOngoingGame", ({ res }: { res: boolean }) => {
      handleHasOngoingGameInServer(res);
    });
  });

  // =========================
  // Styling the lobby
  // =========================
  const sideBySideLayout = useMediaQuery({ query: "(min-width: 1300px)" });
  let [groundSize, wallWidth] = isLargeScreen
    ? [cellSizes.groundSize, cellSizes.wallWidth]
    : [cellSizes.smallScreenGroundSize, cellSizes.smallScreenWallWidth];
  const [bHeight, bWidth] = boardPixelDims(maxBoardDims, groundSize, wallWidth);
  const gapSize = isLargeScreen ? 15 : 6;
  const headerHeight = 40;
  const comboHeight = bHeight + headerHeight;
  let gridTemplAreas, gridTemplRows, gridTemplCols;
  if (sideBySideLayout) {
    gridTemplAreas = "'showcaseArea tabsArea'";
    gridTemplRows = `${comboHeight}px`;
    gridTemplCols = `${bWidth}px ${bWidth}px`;
  } else {
    gridTemplAreas = "'showcaseArea' 'tabsArea'";
    gridTemplRows = `${comboHeight}px ${comboHeight}px`;
    gridTemplCols = `${bWidth}px`;
  }
  const gridStyle = {
    display: "grid",
    gridTemplateRows: gridTemplRows,
    gridTemplateColumns: gridTemplCols,
    gridTemplateAreas: gridTemplAreas,
    columnGap: `${2 * gapSize}px`,
    rowGap: `${gapSize}px`,
    margin: `${gapSize}px`,
    justifyContent: "center",
    alignContent: "center",
  };
  const rankingHeight = `${comboHeight}px`;
  const rankingWidth = `${1.5 * bWidth}px`;
  const rankingHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        justifySelf: "center",
        fontSize: "20px",
        paddingBottom: gapSize,
        height: headerHeight,
      }}
      title={"Ranking based on ELO points."}
    >
      ELO Ranking
    </div>
  );
  const puzzleHeight = `${comboHeight / 2}px`;
  const puzzleWidth = `${bWidth}px`;
  const puzzleHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        justifySelf: "center",
        fontSize: "20px",
        paddingBottom: gapSize,
        height: headerHeight,
      }}
      title={"Find the best move."}
    >
      Puzzles
    </div>
  );

  const gameShowcaseHeader = (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        justifySelf: "center",
        fontSize: "20px",
        paddingBottom: gapSize,
        height: headerHeight,
      }}
      title={"Random games already played"}
    >
      Game Showcase
    </div>
  );
  const returnToGameButton = (
    <TextButton
      text="Return to game"
      tooltip="Continue ongoing game"
      onClick={handleReturnToGame}
      menuTheme={appState.menuTheme}
      isDarkModeOn={appState.isDarkModeOn}
      isImportant={true}
    />
  );

  return (
    <div
      style={{
        paddingBottom: "2rem",
      }}
    >
      <div>
        <Header
          context={"lobby"}
          isLargeScreen={isLargeScreen}
          menuTheme={appState.menuTheme}
          isDarkModeOn={appState.isDarkModeOn}
          helpText={lobbyHelpText}
          aboutText={aboutText}
          handleToggleDarkMode={handleToggleDarkMode}
          handleToggleTheme={handleToggleTheme}
          hasOngoingGame={appState.hasOngoingGame}
          isLoggedIn={isLoggedIn}
          playerName={appState.playerName}
        />
        <LobbyForm
          // @ts-ignore
          appState={appState}
          isLargeScreen={isLargeScreen}
          showMoreOptions={state.showMoreOptions}
          inputtedDuration={state.inputtedDuration}
          inputtedIncrement={state.inputtedIncrement}
          handlePlayerName={handlePlayerName}
          handleInputtedDuration={handleInputtedDuration}
          handleInputtedIncrement={handleInputtedIncrement}
          handleIsPrivate={handleIsPrivate}
          handleNumRows={handleNumRows}
          handleNumCols={handleNumCols}
          handleShowMoreOptions={handleShowMoreOptions}
          handlePosSetting={handlePosSetting}
          handleJoinCode={handleJoinCode}
          handleCreateGame={handleCreateGame}
          handleJoinGame={handleJoinGame}
          handleLocalGame={handleLocalGame}
          handleComputerGame={handleComputerGame}
          handleRefreshName={handleRefreshName}
          handleToken={handleToken}
          handleIdToken={handleIdToken}
        />
        {appState.hasOngoingGame && ( // todo: do we need to check here if the eloId matches?
          <div
            style={{
              marginTop: "1rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {returnToGameButton}
          </div>
        )}
        <div style={gridStyle}>
          <div style={{ gridArea: "showcaseArea" }}>
            {gameShowcaseHeader}
            <GameShowcase
              isLargeScreen={isLargeScreen}
              menuTheme={appState.menuTheme}
              boardTheme={appState.boardTheme}
              isDarkModeOn={appState.isDarkModeOn}
              handleViewGame={handleViewGame}
            />
          </div>
          <div
            style={{
              gridArea: "tabsArea",
              height: "100%",
            }}
          >
            <LobbyTabs
              isLargeScreen={isLargeScreen}
              menuTheme={appState.menuTheme}
              isDarkModeOn={appState.isDarkModeOn}
              handleViewGame={handleViewGame}
              handleAcceptChallenge={handleAcceptChallenge}
            />
          </div>
        </div>
        {rankingHeader}
        <div
          style={{
            height: rankingHeight,
            width: rankingWidth,
            marginLeft: "auto",
            marginRight: "auto",
            border: `1px solid ${getColor(
              appState.menuTheme,
              "container",
              appState.isDarkModeOn
            )}`,
            paddingBottom: "2rem",
          }}
        >
          <RankingList
            isLargeScreen={isLargeScreen}
            menuTheme={appState.menuTheme}
            isDarkModeOn={appState.isDarkModeOn}
          />
        </div>
        {puzzleHeader}
        <div
          style={{
            height: puzzleHeight,
            width: puzzleWidth,
            marginLeft: "auto",
            marginRight: "auto",
            border: `1px solid ${getColor(
              appState.menuTheme,
              "container",
              appState.isDarkModeOn
            )}`,
          }}
        >
          <PuzzleList
            idToken={appState.idToken}
            menuTheme={appState.menuTheme}
            isDarkModeOn={appState.isDarkModeOn}
            handleSolvePuzzle={handleSolvePuzzle}
          />
        </div>{" "}
      </div>
    </div>
  );
}
