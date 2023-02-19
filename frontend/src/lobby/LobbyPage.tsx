import { useEffect } from "react";
import { Row, Col, Button } from "react-materialize";
import { useMediaQuery } from "react-responsive";
import { ToastContainer } from "react-toastify";
import { useCookies } from "react-cookie";
import { useImmer } from "use-immer";
import { randPlayerName, randEloId } from "../shared/utils";
import { getColor, MenuThemeName } from "../shared/colorThemes";
import blueBgDark from "./../static/blueBgDark.jfif";
import blueBgLight from "./../static/blueBgLight.jfif";
import {
  defaultInitialPlayerPos,
  defaultGoalPos,
  defaultBoardSettings,
  maxBoardDims,
  cellSizes,
} from "../shared/globalSettings";
import LobbyForm from "./LobbyForm";
import LobbyTabs from "./LobbyTabs";
import RankingList from "./RankingList";
import PuzzleList from "./PuzzleList";
import GamePage from "../game/GamePage";
import GameShowcase from "./GameShowcase";
import Header from "../shared/Header";
import { lobbyHelpText, aboutText } from "./lobbyHelp";
import showToastNotification from "../shared/showToastNotification";
import {
  emptyBoardDistances,
  boardPixelDims,
  BoardSettings,
  TimeControl,
} from "../shared/gameLogicUtils";
import { Puzzle } from "../game/puzzleLogic";
import { RoleEnum } from "../game/gameState";
import handleLogin from "../shared/auth";

const boardTheme = "monochromeBoard";
const maxPlayerNameLen = 9;
const minEloIdLen = 4;
const maxEloIdLen = 16;

// Fields that are passed to the GamePage when it is opened.
export type ClientParams = {
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  showMoreOptions: boolean;
  boardSettings: BoardSettings;
  joinCode: string;
  playerName: string;
  timeControl: TimeControl;
  isPrivate: boolean;
  token: string;
  eloId: string;
  clientRole: RoleEnum;
  watchGameId: string | null;
  puzzle?: Puzzle;
};

export type LobbyState = {
  playerName: string;
  token: string;
  timeControl: {
    duration: string | number;
    increment: string | number;
  };
  boardSettings: BoardSettings;
  joinCode: string;
  clientRole: RoleEnum;
  watchGameId: string | null;
  eloId: string;
  isPrivate: boolean;
  isGamePageOpen: boolean;
  hasOngoingGame: boolean;
  isDarkModeOn: boolean;
  menuTheme: MenuThemeName;
  showMoreOptions: boolean;
  puzzle?: Puzzle;
};

function initialLobbyState(cookies: Cookies): LobbyState {
  // @ts-ignore
  let nr = parseFloat(cookies.numRows);
  nr = isNaN(nr) ? defaultBoardSettings.dims[0] : nr;
  // @ts-ignore
  let nc = parseFloat(cookies.numCols);
  nc = isNaN(nc) ? defaultBoardSettings.dims[1] : nc;
  return {
    playerName: cookies.playerName || randPlayerName(maxPlayerNameLen),
    token: cookies.token || "default",
    timeControl: {
      duration: cookies.duration || "5",
      increment: cookies.increment || "5",
    },
    boardSettings: {
      dims: [nr, nc],
      startPos: defaultInitialPlayerPos([nr, nc]),
      goalPos: defaultGoalPos([nr, nc]),
    },
    joinCode: "",
    clientRole: RoleEnum.none,
    watchGameId: null,
    eloId:
      cookies.eloId &&
      cookies.eloId.length >= minEloIdLen &&
      cookies.eloId.length <= maxEloIdLen
        ? cookies.eloId
        : randEloId(maxEloIdLen),
    isPrivate: cookies.isPrivate && cookies.isPrivate === "true" ? true : false,
    isGamePageOpen: false,
    hasOngoingGame: false,
    isDarkModeOn:
      cookies.isDarkModeOn && cookies.isDarkModeOn === "true" ? true : false,
    menuTheme:
      cookies.menuTheme && cookies.menuTheme === "green" ? "green" : "blue",
    showMoreOptions: false,
  };
}

export type PosSetting = {
  player: number;
  // 0 for row and 1 for column.
  // todo: use enum.
  coord: 0 | 1;
  val: number;
};

export type Cookies = {
  isDarkModeOn?: string;
  menuTheme?: MenuThemeName;
  token?: string;
  playerName?: string;
  duration?: string;
  increment?: string;
  numRows?: string;
  numCols?: string;
  eloId?: string;
  isPrivate?: string;
  isVolumeOn?: string;
  zoomLevel?: string;
};

function LobbyPage({ socket }: { socket: any }): JSX.Element {
  const [cookies, setCookie] = useCookies([
    "isDarkModeOn",
    "menuTheme",
    "token",
    "playerName",
    "duration",
    "increment",
    "numRows",
    "numCols",
    "eloId",
    "isPrivate",
  ]);
  const [state, updateState] = useImmer(initialLobbyState(cookies));

  const handleToggleTheme = () => {
    const newTheme = state.menuTheme === "green" ? "blue" : "green";
    updateState((draftState) => {
      draftState.menuTheme = newTheme;
    });
    setCookie("menuTheme", newTheme, { path: "/" });
  };
  const handleToggleDarkMode = () => {
    const newSetting = !state.isDarkModeOn;
    updateState((draftState) => {
      draftState.isDarkModeOn = newSetting;
    });
    setCookie("isDarkModeOn", newSetting ? "true" : "false", {
      path: "/",
    });
  };
  const handlePlayerName = (name: string) => {
    updateState((draftState) => {
      draftState.playerName = name.slice(0, maxPlayerNameLen);
    });
  };
  const handleRefreshName = () => {
    updateState((draftState) => {
      draftState.playerName = randPlayerName(maxPlayerNameLen);
    });
  };
  const handleEloId = (eloId: string) => {
    updateState((draftState) => {
      draftState.eloId = eloId.slice(0, maxEloIdLen);
    });
  };
  const handleToken = (icon: string) => {
    updateState((draftState) => {
      draftState.token = icon;
    });
    setCookie("token", icon, { path: "/" });
  };
  const handleDuration = (val: string) => {
    updateState((draftState) => {
      draftState.timeControl.duration = val;
    });
  };
  const handleIncrement = (val: string) => {
    updateState((draftState) => {
      draftState.timeControl.increment = val;
    });
  };
  const handleIsPrivate = (val: boolean) => {
    updateState((draftState) => {
      draftState.isPrivate = val;
    });
    setCookie("isPrivate", val ? "true" : "false", {
      path: "/",
    });
  };
  const handleNumRows = (nr: number) => {
    updateState((draftState) => {
      const curNr = draftState.boardSettings.dims[0];
      draftState.boardSettings.dims[0] = nr;
      for (let i = 0; i < 2; i++) {
        let pRow = draftState.boardSettings.startPos[i][0];
        if (pRow >= nr - 1 || pRow === curNr - 1) {
          draftState.boardSettings.startPos[i][0] = nr - 1;
        }
        let gRow = draftState.boardSettings.goalPos[i][0];
        if (gRow >= nr - 1 || gRow === curNr - 1) {
          draftState.boardSettings.goalPos[i][0] = nr - 1;
        }
      }
    });
  };
  const handleNumCols = (nc: number) => {
    updateState((draftState) => {
      const curNc = draftState.boardSettings.dims[1];
      draftState.boardSettings.dims[1] = nc;
      for (let i = 0; i < 2; i++) {
        let pCol = draftState.boardSettings.startPos[i][1];
        if (pCol >= nc - 1 || pCol === curNc - 1) {
          draftState.boardSettings.startPos[i][1] = nc - 1;
        }
        let gCol = draftState.boardSettings.goalPos[i][1];
        if (gCol >= nc - 1 || gCol === curNc - 1) {
          draftState.boardSettings.goalPos[i][1] = nc - 1;
        }
      }
    });
  };
  const handleShowMoreOptions = () => {
    updateState((draftState) => {
      draftState.showMoreOptions = !draftState.showMoreOptions;
    });
  };

  const handleStartPos = ({ player, coord, val }: PosSetting) => {
    updateState((draftState) => {
      draftState.boardSettings.startPos[player][coord] = val;
    });
  };
  const handleGoalPos = ({ player, coord, val }: PosSetting) => {
    updateState((draftState) => {
      draftState.boardSettings.goalPos[player][coord] = val;
    });
  };
  const handleJoinCode = (code: string) => {
    updateState((draftState) => {
      draftState.joinCode = code;
    });
  };
  const handleCreateGame = () => {
    const dur = validateDuration();
    const inc = validateIncrement();
    const bs = validateBoardSettings();
    const name = validateName();
    const eloId = validateEloId();
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.creator;
      // Duration and increment are converted from string to number here.
      draftState.timeControl.duration = dur;
      draftState.timeControl.increment = inc;
      draftState.boardSettings = bs;
      draftState.playerName = name;
      draftState.eloId = eloId;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
    });
  };
  const handleJoinGame = () => {
    const name = validateName();
    const eloId = validateEloId();
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.joiner;
      draftState.playerName = name;
      draftState.eloId = eloId;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
    });
  };
  const handleAcceptChallenge = (joinCode: string) => {
    const name = validateName();
    const eloId = validateEloId();
    updateState((draftState) => {
      draftState.joinCode = joinCode;
      draftState.clientRole = RoleEnum.joiner;
      draftState.playerName = name;
      draftState.eloId = eloId;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
    });
  };
  const handleReturnToGame = () => {
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.returner;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
    });
  };
  const handleViewGame = (watchGameId: string) => {
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.spectator;
      draftState.watchGameId = watchGameId;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
    });
  };
  const handleReturnToLobby = () => {
    updateState((draftState) => {
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = false;
      draftState.clientRole = RoleEnum.none;
      draftState.joinCode = "";
    });
  };

  const handleLocalGame = () => {
    const dur = validateDuration();
    const inc = validateIncrement();
    const bs = validateBoardSettings();
    const name = validateName();
    const eloId = validateEloId();
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.offline;
      // Duration and increment are converted from string to number here.
      draftState.timeControl.duration = dur;
      draftState.timeControl.increment = inc;
      draftState.boardSettings = bs;
      draftState.playerName = name;
      draftState.eloId = eloId;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
    });
  };
  const handleComputerGame = () => {
    const name = validateName();
    const eloId = validateEloId();
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.computer;
      // Overwrite dimensions for computer game (can only be 7x7).
      const board_dim = 7;
      const internal_dim = board_dim * 2 - 1;
      draftState.boardSettings = {
        dims: [internal_dim, internal_dim],
        startPos: defaultInitialPlayerPos([internal_dim, internal_dim]),
        goalPos: defaultGoalPos([internal_dim, internal_dim]),
      };
      draftState.playerName = name;
      draftState.eloId = eloId;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
    });
  };
  const handleSolvePuzzle = (puzzle: Puzzle) => {
    const name = validateName();
    const eloId = validateEloId();
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.puzzle;
      draftState.playerName = name;
      draftState.eloId = eloId;
      draftState.hasOngoingGame = false;
      draftState.isGamePageOpen = true;
      draftState.puzzle = puzzle;
    });
  };

  const validateName = () => {
    let name = state.playerName;
    if (name === "") name = "Anon";
    else setCookie("playerName", name, { path: "/" });
    return name;
  };
  const validateEloId = () => {
    let eloId = state.eloId;
    if (eloId.length < minEloIdLen || eloId.length > maxEloIdLen)
      eloId = randEloId(maxEloIdLen);
    else setCookie("eloId", eloId, { path: "/" });
    return eloId;
  };
  const validateDuration = () => {
    let dur = parseFloat(`${state.timeControl.duration}`);
    if (isNaN(dur)) {
      dur = 5;
      showToastNotification("Invalid duration, using 5m instead", 5000);
    } else if (dur < 0.1) {
      dur = 5 / 60;
      showToastNotification("Duration too short, using 5s instead", 5000);
    } else if (dur > 120) {
      dur = 120;
      showToastNotification("Duration too long, using 2h instead", 5000);
    } else {
      setCookie("duration", dur, { path: "/" });
    }
    return dur;
  };
  const validateIncrement = () => {
    let inc = parseFloat(`${state.timeControl.increment}`);
    if (isNaN(inc) || inc < 0) {
      inc = 0;
      showToastNotification("Invalid increment, using 0s instead", 5000);
    } else if (inc > 300) {
      inc = 300;
      showToastNotification("Increment too large, using 5m instead", 5000);
    } else {
      setCookie("increment", inc, { path: "/" });
    }
    return inc;
  };
  const validateBoardSettings = () => {
    const bs = state.boardSettings;
    const dists = emptyBoardDistances(bs);
    if (dists[0] <= 2 || dists[1] <= 2) {
      showToastNotification(
        "The goal is too close to the player, using default board instead",
        5000
      );
      return defaultBoardSettings;
    } else {
      setCookie("numRows", state.boardSettings.dims[0], {
        path: "/",
      });
      setCookie("numCols", state.boardSettings.dims[1], {
        path: "/",
      });
      return bs;
    }
  };

  // Determine if the "Return To Game" button needs to be shown.
  useEffect(() => {
    if (!state.hasOngoingGame && !state.isGamePageOpen) {
      socket.emit("checkHasOngoingGame", { eloId: state.eloId });
    }
  }, [socket, state.hasOngoingGame, state.isGamePageOpen, state.eloId]);
  useEffect(() => {
    socket.on("respondHasOngoingGame", ({ res }: { res: boolean }) => {
      updateState((draftState) => {
        if (!draftState.isGamePageOpen) draftState.hasOngoingGame = res;
      });
    });
  });

  // Set the background of the entire site based on theme and dark mode.
  useEffect(() => {
    document.body.style.backgroundColor = getColor(
      state.menuTheme,
      "background",
      state.isDarkModeOn
    );
    if (state.menuTheme === "blue") {
      document.body.style.backgroundImage = `url('${
        state.isDarkModeOn ? blueBgDark : blueBgLight
      }')`;
    } else {
      document.body.style.backgroundImage = "none";
    }
  }, [state.isDarkModeOn, state.menuTheme]);

  const sideBySideLayout = useMediaQuery({ query: "(min-width: 1300px)" });
  const isLargeScreen = useMediaQuery({ query: "(min-width: 990px)" });
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
    <Button
      large
      style={{
        backgroundColor: getColor(
          state.menuTheme,
          "importantButton",
          state.isDarkModeOn
        ),
      }}
      node="button"
      waves="light"
      onClick={() => {
        handleReturnToGame();
      }}
    >
      Return to game
    </Button>
  );

  return (
    <div
      style={{
        paddingBottom: "2rem",
      }}
    >
      <ToastContainer />
      {state.isGamePageOpen && (
        <GamePage
          socket={socket}
          // @ts-ignore
          clientParams={state}
          isLargeScreen={isLargeScreen}
          boardTheme={boardTheme}
          handleReturnToLobby={handleReturnToLobby}
          handleToggleDarkMode={handleToggleDarkMode}
          handleToggleTheme={handleToggleTheme}
        />
      )}
      {!state.isGamePageOpen && (
        <div>
          <Header
            context={"lobby"}
            isLargeScreen={isLargeScreen}
            menuTheme={state.menuTheme}
            isDarkModeOn={state.isDarkModeOn}
            helpText={lobbyHelpText}
            aboutText={aboutText}
            handleToggleDarkMode={handleToggleDarkMode}
            handleToggleTheme={handleToggleTheme}
            handleLogin={handleLogin}
          />
          <LobbyForm
            // @ts-ignore
            clientParams={state}
            isLargeScreen={isLargeScreen}
            handlePlayerName={handlePlayerName}
            handleDuration={handleDuration}
            handleIncrement={handleIncrement}
            handleIsPrivate={handleIsPrivate}
            handleNumRows={handleNumRows}
            handleNumCols={handleNumCols}
            handleShowMoreOptions={handleShowMoreOptions}
            handleStartPos={handleStartPos}
            handleGoalPos={handleGoalPos}
            handleJoinCode={handleJoinCode}
            handleCreateGame={handleCreateGame}
            handleJoinGame={handleJoinGame}
            handleLocalGame={handleLocalGame}
            handleComputerGame={handleComputerGame}
            handleRefreshName={handleRefreshName}
            handleToken={handleToken}
            handleEloId={handleEloId}
          />
          {state.hasOngoingGame && ( // todo: do we need to check here if the eloId matches?
            <Row className="valign-wrapper" style={{ marginTop: "1rem" }}>
              <Col className="center" s={12}>
                {returnToGameButton}
              </Col>
            </Row>
          )}
          <div style={gridStyle}>
            <div style={{ gridArea: "showcaseArea" }}>
              {gameShowcaseHeader}
              <GameShowcase
                socket={socket}
                isLargeScreen={isLargeScreen}
                menuTheme={state.menuTheme}
                boardTheme={boardTheme}
                isDarkModeOn={state.isDarkModeOn}
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
                socket={socket}
                isLargeScreen={isLargeScreen}
                menuTheme={state.menuTheme}
                isDarkModeOn={state.isDarkModeOn}
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
                state.menuTheme,
                "container",
                state.isDarkModeOn
              )}`,
              paddingBottom: "2rem",
            }}
          >
            <RankingList
              socket={socket}
              isLargeScreen={isLargeScreen}
              menuTheme={state.menuTheme}
              isDarkModeOn={state.isDarkModeOn}
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
                state.menuTheme,
                "container",
                state.isDarkModeOn
              )}`,
            }}
          >
            <PuzzleList
              socket={socket}
              eloId={state.eloId}
              menuTheme={state.menuTheme}
              isDarkModeOn={state.isDarkModeOn}
              handleSolvePuzzle={handleSolvePuzzle}
            />
          </div>{" "}
        </div>
      )}
    </div>
  );
}

export default LobbyPage;
