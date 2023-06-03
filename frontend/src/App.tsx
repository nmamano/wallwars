import { useEffect, useState } from "react";
import socket from "./socket";
import { useAuth0 } from "@auth0/auth0-react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { MenuThemeName, BoardThemeName, getColor } from "./shared/colorThemes";
import { RoleEnum, ServerGame } from "./game/gameState";
import GamePage from "./game/GamePage";
import { parseFloatOrUndef } from "./shared/utils";
import LobbyPage from "./lobby/LobbyPage";
import { useMediaQuery } from "react-responsive";
import { useImmer } from "use-immer";
import showToastNotification from "./shared/showToastNotification";
import { ToastContainer } from "react-toastify";
import { useCookies } from "react-cookie";
import blueBgDark from "./static/blueBgDark.jfif";
import createModule from "./ai.mjs";
import blueBgLight from "./static/blueBgLight.jfif";
import {
  defaultInitialPlayerPos,
  defaultGoalPos,
  defaultBoardSettings,
} from "./shared/globalSettings";
import {
  emptyBoardDistances,
  BoardSettings,
  TimeControl,
} from "./shared/gameLogicUtils";
import ErrorPage from "./shared/ErrorPage";
import { version } from "wallwars-core";

export type Cookies = {
  isDarkModeOn?: string;
  menuTheme?: MenuThemeName;
  token?: string;
  duration?: string;
  increment?: string;
  numRows?: string;
  numCols?: string;
  isPrivate?: string;
  isRated?: string;
  isVolumeOn?: string;
  zoomLevel?: string;
};

// Main piece of state, relevant across routes.
export type AppState = {
  // Indicates if the player is in a game in the server. When true, a button appears in the lobby
  // to return to the game.
  hasOngoingGame: boolean;
  // The role that the user plays when it creates or joins a game.
  clientRole: RoleEnum;
  // The code that can be shared with others to join private games.
  joinCode: string;
  playerName: string;
  // The icon of the player's piece.
  token: string;
  idToken: string;
  boardSettings: BoardSettings;
  timeControl: TimeControl;
  // The id of the game when the user looks at a historical game, used to fetch the proper game from
  // the server.
  watchGameId: string | null;
  // Indicates if the game is private or not when the user clicks the "create game" button.
  isPrivate: boolean;

  // Parameters received from the server when creating a game.
  creatorStarts: boolean;
  rating: number;

  // Parameters received from the server when returning to a game.
  ongoingGame: ServerGame | null;
  isCreator: boolean;
  timeLeft: [number, number];

  // Cosmetic settings.
  isDarkModeOn: boolean;
  menuTheme: MenuThemeName;
  boardTheme: BoardThemeName;

  // Indicates if the game is rated or not when the user clicks the "create game" button.
  isRated: boolean;
};

// Specifies the row or column of the start or goal position
// of the creator or joiner.
export type PosSetting = {
  player: "creator" | "joiner";
  coord: "row" | "col";
  posType: "start" | "goal";
  val: number;
};

function initialAppState(cookies: Cookies): AppState {
  let nr = parseFloatOrUndef(cookies.numRows, defaultBoardSettings.dims[0]);
  let nc = parseFloatOrUndef(cookies.numCols, defaultBoardSettings.dims[1]);

  return {
    hasOngoingGame: false,
    clientRole: RoleEnum.none,
    joinCode: "",
    playerName: "Guest",
    token: cookies.token || "default",
    boardSettings: {
      dims: [nr, nc],
      startPos: defaultInitialPlayerPos([nr, nc]),
      goalPos: defaultGoalPos([nr, nc]),
    },
    timeControl: {
      duration: parseFloatOrUndef(cookies.duration, 10),
      increment: parseFloatOrUndef(cookies.increment, 5),
    },
    watchGameId: null,
    isPrivate: cookies.isPrivate && cookies.isPrivate === "true" ? true : false,
    isRated: cookies.isRated && cookies.isRated === "false" ? false : true,
    idToken: "", // guests (logged out users) have an empty-string idToken

    creatorStarts: false,
    rating: 0,

    ongoingGame: null,
    isCreator: false,
    timeLeft: [0, 0],

    isDarkModeOn:
      cookies.isDarkModeOn && cookies.isDarkModeOn === "true" ? true : false,
    menuTheme:
      cookies.menuTheme && cookies.menuTheme === "green" ? "green" : "blue",
    boardTheme: "monochromeBoard",
  };
}

export default function App() {
  useEffect(() => {
    console.log(`Using ${version()}`);
  }, []);

  const isLargeScreen = useMediaQuery({ query: "(min-width: 990px)" });

  const [cookies, setCookie] = useCookies([
    "isDarkModeOn",
    "menuTheme",
    "token",
    "playerName",
    "duration",
    "increment",
    "numRows",
    "numCols",
    "isPrivate",
    "isRated",
  ]);

  const [state, updateState] = useImmer<AppState>(initialAppState(cookies));

  const navigate = useNavigate();

  // ========================================================================
  // Authentication logic
  // ========================================================================
  const { error, isAuthenticated, user, loginWithRedirect } = useAuth0();
  useEffect(() => {
    console.log(
      `user: ${user}, isAuthenticated: ${isAuthenticated}, error: ${error}`
    );
    if (error) {
      console.log("There was an error while authenticating:\n", error);
      return;
    }
    if (!isAuthenticated) return;

    if (user === undefined) {
      console.error("user is authenticated but undefined");
      return;
    }
    if (user.sub === undefined || user.sub === "") {
      console.error("user.sub is undefined or empty");
      return;
    }
    updateState((draftState) => {
      draftState.idToken = user.sub!;
    });
    // Tell the server that we have an id token. This asks the server to do one
    // of 2 things:
    // - If the server has a player in the DB with this id token, it returns to
    // us the player's name.
    // - Otherwise, the server creates a new player with this id token in the
    // DB with a unique name and also returns it to us as our initial non-guest
    // name (that we can later change).
    console.log("emitting logInOrSignUp: ", user.sub);
    socket.emit("logInOrSignUp", { idToken: user.sub });
    return;
  }, [user, isAuthenticated, error, updateState]);

  const handleLogin = () => {
    loginWithRedirect();
  };
  const handleGoToProfile = () => {
    // TODO: implement
    showToastNotification("Profile page not implemented yet, sorry");
  };

  // ========================================================================
  // Functions to modify the state
  // ========================================================================

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
    if (state.idToken === "") return; // Guests cannot change name.
    socket.emit("changeName", { name });
  };

  const handleToken = (icon: string) => {
    updateState((draftState) => {
      draftState.token = icon;
    });
    setCookie("token", icon, { path: "/" });
  };

  const handleIsPrivate = (val: boolean) => {
    updateState((draftState) => {
      draftState.isPrivate = val;
    });
    setCookie("isPrivate", val ? "true" : "false", {
      path: "/",
    });
  };

  const handleIsRated = (val: boolean) => {
    updateState((draftState) => {
      draftState.isRated = val;
    });
    setCookie("isRated", val ? "true" : "false", {
      path: "/",
    });
  };

  const handleNumRows = (nr: number) => {
    updateState((draftState) => {
      const curNr = draftState.boardSettings.dims[0];
      draftState.boardSettings.dims[0] = nr;
      // Adjust the start and goal positions if they are out of bounds.
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
    // The number of rows is saved in a cookie when a game is started.
  };

  const handleNumCols = (nc: number) => {
    updateState((draftState) => {
      const curNc = draftState.boardSettings.dims[1];
      draftState.boardSettings.dims[1] = nc;
      // Adjust the start and goal positions if they are out of bounds.
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
    // The number of columns is saved in a cookie when a game is started.
  };

  const handlePosSetting = ({ player, coord, posType, val }: PosSetting) => {
    const playerIndex = player === "creator" ? 0 : 1;
    const coordIndex = coord === "row" ? 0 : 1;
    if (posType === "start") {
      updateState((draftState) => {
        draftState.boardSettings.startPos[playerIndex][coordIndex] = val;
      });
    } else {
      updateState((draftState) => {
        draftState.boardSettings.goalPos[playerIndex][coordIndex] = val;
      });
    }
  };
  const handleJoinCode = (code: string) => {
    updateState((draftState) => {
      draftState.joinCode = code;
    });
  };

  const handleReturnToLobby = () => {
    updateState((draftState: AppState) => {
      draftState.hasOngoingGame = false;
      draftState.clientRole = RoleEnum.none;
      draftState.joinCode = "";
    });
    navigate("/");
  };

  const handleCreateGame = (strDur: string, strInc: string) => {
    const dur = validateOrFixDuration(strDur);
    setCookie("duration", dur, { path: "/" });
    const inc = validateOrFixIncrement(strInc);
    setCookie("increment", inc, { path: "/" });
    const bs = validateOrFixBoardSettings(state.boardSettings);
    setCookie("numRows", bs.dims[0], { path: "/" });
    setCookie("numCols", bs.dims[1], { path: "/" });

    updateState((draftState) => {
      draftState.clientRole = RoleEnum.creator;
      draftState.timeControl.duration = dur;
      draftState.timeControl.increment = inc;
      draftState.boardSettings = bs;
      draftState.playerName = state.playerName;
      draftState.hasOngoingGame = false;
    });
    socket.emit("createGame", {
      token: state.token,
      timeControl: state.timeControl,
      boardSettings: state.boardSettings,
      isPublic: !state.isPrivate,
      isRated: state.isRated,
    });
  };

  useEffect(() => {
    // We receive our name from the server upon log in.
    socket.on("loggedIn", ({ name }: { name: string }) => {
      updateState((draftState) => {
        draftState.playerName = name;
      });
    });

    // When a player logs in for the first time, the server will respond with
    // a valid unique name generated on the server.
    socket.on("signedUp", ({ name }: { name: string }) => {
      console.log(`signedUp: ${name}`);
      updateState((draftState) => {
        draftState.playerName = name;
      });
    });

    socket.on("signUpFailed", () => {
      console.log("problem when signing up");
    });

    socket.once(
      "gameCreated",
      ({
        joinCode,
        creatorStarts,
        rating,
      }: {
        joinCode: string;
        creatorStarts: boolean;
        rating: number;
      }) => {
        updateState((draftState) => {
          draftState.joinCode = joinCode;
          draftState.creatorStarts = creatorStarts;
          draftState.rating = rating;
        });
        navigate(`/game/${joinCode}`);
      }
    );

    socket.on("createGameFailed", () => {
      showToastNotification("Creating a game failed");
    });

    socket.on("nameChanged", ({ name }: { name: string }) => {
      updateState((draftState) => {
        if (draftState.playerName === name) return;
        showToastNotification("Name changed successfully!", 5000);
        draftState.playerName = name;
      });
    });

    socket.on("nameChangeFailed", ({ reason }: { reason: string }) => {
      showToastNotification(`Name change failed: ${reason}`, 10000);
    });

    socket.on(
      "returnedToOngoingGame",
      ({
        ongoingGame,
        isCreator,
        timeLeft,
      }: {
        ongoingGame: ServerGame;
        isCreator: boolean;
        timeLeft: [number, number];
      }) => {
        updateState((draftState) => {
          draftState.ongoingGame = ongoingGame;
          draftState.isCreator = isCreator;
          draftState.timeLeft = timeLeft;
        });
        navigate(`/game/${ongoingGame.joinCode}`);
      }
    );
  }, [updateState, navigate]);

  const handleJoinGame = () => {
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.joiner;
      draftState.playerName = state.playerName;
      draftState.hasOngoingGame = false;
    });
    navigate(`/game/${state.joinCode}`);
  };

  const handleAcceptChallenge = (joinCode: string) => {
    updateState((draftState) => {
      draftState.joinCode = joinCode;
      draftState.clientRole = RoleEnum.joiner;
      draftState.playerName = state.playerName;
      draftState.hasOngoingGame = false;
    });
    navigate(`/game/${joinCode}`);
  };

  const handleReturnToGame = () => {
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.returner;
      draftState.hasOngoingGame = false;
    });
    socket.emit("returnToOngoingGame");
  };

  const handleViewGame = (watchGameId: string) => {
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.spectator;
      draftState.watchGameId = watchGameId;
      draftState.hasOngoingGame = false;
    });
    navigate(`/game/${watchGameId}`);
  };

  const handleLocalGame = (strDur: string, strInc: string) => {
    const dur = validateOrFixDuration(strDur);
    setCookie("duration", dur, { path: "/" });
    const inc = validateOrFixIncrement(strInc);
    setCookie("increment", inc, { path: "/" });
    const bs = validateOrFixBoardSettings(state.boardSettings);
    setCookie("numRows", bs.dims[0], { path: "/" });
    setCookie("numCols", bs.dims[1], { path: "/" });

    updateState((draftState) => {
      draftState.clientRole = RoleEnum.offline;
      draftState.timeControl.duration = dur;
      draftState.timeControl.increment = inc;
      draftState.boardSettings = bs;
      draftState.playerName = state.playerName;
      draftState.hasOngoingGame = false;
    });
    navigate("/game/local", { replace: true });
  };

  const handleComputerGame = () => {
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
      draftState.playerName = state.playerName;
      draftState.hasOngoingGame = false;
    });
    navigate("/game/computer", { replace: true });
  };

  const handleSolvePuzzle = (puzzleId: string) => {
    updateState((draftState) => {
      draftState.clientRole = RoleEnum.puzzle;
      draftState.playerName = state.playerName;
      draftState.hasOngoingGame = false;
    });
    navigate(`/puzzle/${puzzleId}`);
  };

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

  const location = useLocation();
  const handleHasOngoingGameInServer = (res: boolean): void => {
    updateState((draftState) => {
      if ((location.pathname = "/")) draftState.hasOngoingGame = res;
    });
  };

  //===================================================
  // WebAssembly AI.
  //===================================================
  const [wasmAIGetMove, setWasmAIGetMove] = useState<(s: string) => string>();
  useEffect(() => {
    createModule().then((Module: any) => {
      setWasmAIGetMove(() => Module.cwrap("GetMove", "string", ["string"]));
    });
  }, []);

  return (
    <>
      <ToastContainer />
      <Routes>
        <Route
          path="/"
          element={
            <LobbyPage
              appState={state}
              isLargeScreen={isLargeScreen}
              handleToggleTheme={handleToggleTheme}
              handleToggleDarkMode={handleToggleDarkMode}
              handlePlayerName={handlePlayerName}
              handleToken={handleToken}
              handleIsPrivate={handleIsPrivate}
              handleIsRated={handleIsRated}
              handleNumRows={handleNumRows}
              handleNumCols={handleNumCols}
              handlePosSetting={handlePosSetting}
              handleJoinCode={handleJoinCode}
              handleCreateGame={handleCreateGame}
              handleJoinGame={handleJoinGame}
              handleAcceptChallenge={handleAcceptChallenge}
              handleReturnToGame={handleReturnToGame}
              handleViewGame={handleViewGame}
              handleLocalGame={handleLocalGame}
              handleComputerGame={handleComputerGame}
              handleSolvePuzzle={handleSolvePuzzle}
              handleHasOngoingGameInServer={handleHasOngoingGameInServer}
              handleLogin={handleLogin}
              handleGoToProfile={handleGoToProfile}
            />
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <GamePage
              clientParams={state}
              isLargeScreen={isLargeScreen}
              handleReturnToLobby={handleReturnToLobby}
              handleToggleDarkMode={handleToggleDarkMode}
              handleToggleTheme={handleToggleTheme}
              wasmAIGetMove={wasmAIGetMove}
            />
          }
        />
        <Route
          path="/puzzle/:puzzleId"
          element={
            <GamePage
              clientParams={state}
              isLargeScreen={isLargeScreen}
              handleReturnToLobby={handleReturnToLobby}
              handleToggleDarkMode={handleToggleDarkMode}
              handleToggleTheme={handleToggleTheme}
            />
          }
        />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </>
  );
}

// ========================================================================
// Utility functions
// ========================================================================
function validateOrFixDuration(strDur: string): number {
  let dur = parseFloat(`${strDur}`);
  if (isNaN(dur)) {
    showToastNotification("Invalid duration, using 5m instead", 5000);
    return 5;
  } else if (dur < 0.1) {
    showToastNotification("Duration too short, using 5s instead", 5000);
    return 5 / 60;
  } else if (dur > 120) {
    showToastNotification("Duration too long, using 2h instead", 5000);
    return 120;
  }
  return dur;
}

function validateOrFixIncrement(strInc: string): number {
  let inc = parseFloat(`${strInc}`);
  if (isNaN(inc) || inc < 0) {
    showToastNotification("Invalid increment, using 0s instead", 5000);
    return 0;
  } else if (inc > 300) {
    showToastNotification("Increment too large, using 5m instead", 5000);
    return 300;
  }
  return inc;
}

function validateOrFixBoardSettings(bs: BoardSettings): BoardSettings {
  const dists = emptyBoardDistances(bs);
  if (dists[0] <= 2 || dists[1] <= 2) {
    showToastNotification(
      "The goal is too close to the player, using default board instead",
      5000
    );
    return defaultBoardSettings;
  } else {
    return bs;
  }
}
