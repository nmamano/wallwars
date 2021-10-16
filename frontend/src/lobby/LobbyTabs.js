import React, { useState, useEffect } from "react";
import { useImmer } from "use-immer";
import { useMediaQuery } from "react-responsive";
import cloneDeep from "lodash.clonedeep";

import ChallengeList from "./ChallengeList";
import RecentGameList from "./RecentGameList";
import { getColor } from "../shared/colorThemes";

const LobbyTabs = ({
  socket,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
  handleViewGame,
  handleAcceptChallenge,
}) => {
  //logic for getting challenges. It needs to be here as opposed to in ChallengeList itself
  //because we switch to the challenges tab automatically when there is a new challenge
  const [state, updateState] = useImmer({
    shownTab: "recent", // one of 'recent', 'challenges', or 'live' (in the future).
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
  }, [socket, updateState, state.needToRequestRecentGameSummaries]);
  useEffect(() => {
    if (state.needToRequestChallenges) {
      updateState((draftState) => {
        draftState.needToRequestChallenges = false;
      });
      socket.emit("requestCurrentChallenges");
    }
  }, [socket, updateState, state.needToRequestChallenges]);
  useEffect(() => {
    socket.once("requestedRecentGameSummaries", ({ recentGameSummaries }) => {
      updateState((draftState) => {
        draftState.recentGameSummaries = recentGameSummaries;
        console.log(recentGameSummaries);
        if (draftState.recentGameSummaries.length > 0) {
          draftState.shownTab = "recent";
        }
      });
    });
  }, [socket, updateState]);
  useEffect(() => {
    socket.once("requestedCurrentChallenges", ({ challenges }) => {
      updateState((draftState) => {
        draftState.challenges = challenges;
        if (draftState.challenges.length > 0) {
          draftState.shownTab = "challenges";
        }
      });
    });
    socket.on("newChallenge", ({ challenge }) => {
      updateState((draftState) => {
        draftState.challenges.push(challenge);
        if (draftState.challenges.length === 1) {
          draftState.shownTab = "challenges";
        }
      });
    });
    socket.on("deadChallenge", ({ joinCode }) => {
      updateState((draftState) => {
        for (let i = 0; i < draftState.challenges.length; i++) {
          const game = draftState.challenges[i];
          if (game.joinCode === joinCode) {
            draftState.challenges.splice(i, 1);
            return;
          }
        }
      });
    });
    return () => {
      socket.off("newChallenge");
      socket.off("deadChallenge");
    };
  }, [socket, updateState]);

  const canHover = !useMediaQuery({ query: "(hover: none)" });
  const [hoveredTab, setHoveredTab] = useState(null);
  const handleMouseEnter = (tab) => {
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
  if (state.shownTab === "recent" || (canHover && hoveredTab === "recent")) {
    recentGamesStyle.backgroundColor = selectedTabColor;
  }
  if (
    state.shownTab === "challenges" ||
    (canHover && hoveredTab === "challenges")
  ) {
    challengesStyle.backgroundColor = selectedTabColor;
  }
  liveGamesStyle.backgroundColor = getColor(
    menuTheme,
    "disabledTab",
    isDarkModeOn
  );
  liveGamesStyle.color = getColor(menuTheme, "disabledTabText", isDarkModeOn);
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
              draftState.shownTab = "challenges";
            });
          }}
          onMouseEnter={() => handleMouseEnter("challenges")}
          onMouseLeave={handleMouseLeave}
          title={"Players looking for an opponent"}
        >
          {`Challenges (${state.challenges.length})`}
        </div>
        <div
          style={recentGamesStyle}
          onClick={() => {
            updateState((draftState) => {
              draftState.shownTab = "recent";
            });
          }}
          onMouseEnter={() => handleMouseEnter("recent")}
          onMouseLeave={handleMouseLeave}
          title={"Games played recently"}
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
      {state.shownTab === "challenges" && (
        <ChallengeList
          challenges={state.challenges}
          isLargeScreen={isLargeScreen}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn}
          handleAcceptChallenge={handleAcceptChallenge}
        />
      )}
      {state.shownTab === "recent" && (
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
};

export default LobbyTabs;
