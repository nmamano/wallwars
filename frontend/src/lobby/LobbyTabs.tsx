import { useState, useEffect } from "react";
import { useImmer } from "use-immer";
import { useMediaQuery } from "react-responsive";
import cloneDeep from "lodash.clonedeep";
import ChallengeList from "./ChallengeList";
import RecentGameList, { ServerGameSummary } from "./RecentGameList";
import { getColor, MenuThemeName } from "../shared/colorThemes";
import { BoardSettings, TimeControl } from "../shared/gameLogicUtils";
import socket from "../socket";

enum LobbyTabName {
  Recent = "recent",
  Challenges = "challenges",
  Live = "live", // The live tab is for the spectator feature. It is not implemented yet.
}

export type Challenge = {
  joinCode: string;
  timeControl: TimeControl;
  playerNames: [string, string];
  boardSettings: BoardSettings;
  creationDate: Date;
  isRated: boolean;
};

export default function LobbyTabs({
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleViewGame,
  handleAcceptChallenge,
}: {
  isLargeScreen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  handleViewGame: (gameId: string) => void;
  handleAcceptChallenge: (challengeId: string) => void;
}): JSX.Element {
  // Logic for getting challenges. It needs to be here as opposed to in ChallengeList itself
  // because we switch to the challenges tab automatically when there is a new challenge.
  const [state, updateState] = useImmer<{
    shownTab: LobbyTabName;
    needToRequestChallenges: boolean;
    challenges: Challenge[];
    needToRequestRecentGameSummaries: boolean;
    recentGameSummaries: ServerGameSummary[];
  }>({
    shownTab: LobbyTabName.Recent,
    needToRequestChallenges: true,
    challenges: [],
    needToRequestRecentGameSummaries: true,
    recentGameSummaries: [],
  });

  useEffect(() => {
    if (state.needToRequestRecentGameSummaries) {
      updateState((draftState) => {
        draftState.needToRequestRecentGameSummaries = false;
      });
      socket.emit("getRecentGameSummaries", {
        count: 200,
      });
    }
  }, [updateState, state.needToRequestRecentGameSummaries]);

  useEffect(() => {
    if (state.needToRequestChallenges) {
      updateState((draftState) => {
        draftState.needToRequestChallenges = false;
      });
      socket.emit("requestCurrentChallenges");
    }
  }, [updateState, state.needToRequestChallenges]);

  useEffect(() => {
    socket.once(
      "requestedRecentGameSummaries",
      ({
        recentGameSummaries,
      }: {
        recentGameSummaries: ServerGameSummary[];
      }) => {
        updateState((draftState) => {
          draftState.recentGameSummaries = recentGameSummaries;
        });
      }
    );
  }, [updateState]);

  useEffect(() => {
    socket.once(
      "requestedCurrentChallenges",
      ({ challenges }: { challenges: Challenge[] }) => {
        updateState((draftState) => {
          draftState.challenges = challenges;
          if (draftState.challenges.length > 0) {
            draftState.shownTab = LobbyTabName.Challenges;
          }
        });
      }
    );

    socket.on("newChallenge", ({ challenge }: { challenge: Challenge }) => {
      updateState((draftState) => {
        draftState.challenges.push(challenge);
        if (draftState.challenges.length === 1) {
          draftState.shownTab = LobbyTabName.Challenges;
        }
      });
    });

    socket.on("deadChallenge", ({ joinCode }: { joinCode: string }) => {
      updateState((draftState) => {
        for (let i = 0; i < draftState.challenges.length; i++) {
          const game = draftState.challenges[i];
          if (game.joinCode === joinCode) {
            draftState.challenges.splice(i, 1);
            break;
          }
        }
        if (draftState.challenges.length === 0) {
          draftState.shownTab = LobbyTabName.Recent;
        }
      });
    });

    return () => {
      socket.off("newChallenge");
      socket.off("deadChallenge");
    };
  }, [updateState]);

  const canHover = !useMediaQuery({ query: "(hover: none)" });
  const [hoveredTab, setHoveredTab] = useState<LobbyTabName | null>(null);
  const handleMouseEnter = (tab: LobbyTabName) => {
    setHoveredTab(tab);
  };
  const handleMouseLeave = () => {
    setHoveredTab(null);
  };

  const tabStyle = {
    alignSelf: "stretch",
    justifySelf: "stretch",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: isLargeScreen ? "16px" : "12px",
    cursor: "pointer",
    borderBottom: `2px solid ${getColor(
      menuTheme,
      "selectedTab",
      isDarkModeOn
    )}`,
    backgroundColor: getColor(menuTheme, "tab", isDarkModeOn),
    fontWeight: "bold",
  };
  let recentGamesStyle = cloneDeep(tabStyle);
  let challengesStyle = cloneDeep(tabStyle);
  let liveGamesStyle = cloneDeep(tabStyle);
  const selectedTabColor = getColor(menuTheme, "selectedTab", isDarkModeOn);
  if (
    state.shownTab === LobbyTabName.Recent ||
    (canHover && hoveredTab === LobbyTabName.Recent)
  ) {
    recentGamesStyle.backgroundColor = selectedTabColor;
  }
  if (
    state.shownTab === LobbyTabName.Challenges ||
    (canHover && hoveredTab === LobbyTabName.Challenges)
  ) {
    challengesStyle.backgroundColor = selectedTabColor;
  }
  liveGamesStyle.backgroundColor = getColor(
    menuTheme,
    "disabledTab",
    isDarkModeOn
  );
  // @ts-ignore
  liveGamesStyle.color = getColor(menuTheme, "disabledTabText", isDarkModeOn);
  // @ts-ignore
  liveGamesStyle.cursor = null;

  return (
    <div
      style={{
        padding: "0px",
        margin: "0px",
        display: "block",
        height: "100%",
        overflowY: "hidden",
        border: `1px solid ${getColor(menuTheme, "container", isDarkModeOn)}`,
      }}
    >
      <div
        style={{
          height: "50px",
          width: "100%",
          display: "grid",
          gridTemplateRows: "1fr",
          gridTemplateColumns: "1fr 1fr 1fr",
          justifyContent: "center",
          alignContent: "center",
        }}
      >
        <div
          style={challengesStyle}
          onClick={() => {
            updateState((draftState) => {
              draftState.shownTab = LobbyTabName.Challenges;
            });
          }}
          onMouseEnter={() => handleMouseEnter(LobbyTabName.Challenges)}
          onMouseLeave={handleMouseLeave}
          title={"Players looking for an opponent. * means rated"}
        >
          {`Challenges (${state.challenges.length})`}
        </div>
        <div
          style={recentGamesStyle}
          onClick={() => {
            updateState((draftState) => {
              draftState.shownTab = LobbyTabName.Recent;
            });
          }}
          onMouseEnter={() => handleMouseEnter(LobbyTabName.Recent)}
          onMouseLeave={handleMouseLeave}
          title={"Games played recently."}
        >
          Recent Games
        </div>
        <div
          style={liveGamesStyle}
          title={"Games being played right now (coming soon)"}
        >
          {"Live Games"}
        </div>
      </div>
      {state.shownTab === LobbyTabName.Challenges && (
        <ChallengeList
          challenges={state.challenges}
          isLargeScreen={isLargeScreen}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn}
          handleAcceptChallenge={handleAcceptChallenge}
        />
      )}
      {state.shownTab === LobbyTabName.Recent && (
        <RecentGameList
          recentGameSummaries={state.recentGameSummaries}
          isLargeScreen={isLargeScreen}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn}
          handleViewGame={handleViewGame}
        />
      )}
    </div>
  );
}
