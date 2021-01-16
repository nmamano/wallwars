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
  recentGames,
  handleViewGame,
  handleAcceptChallenge,
}) => {
  //logic for getting challenges. It needs to be here as opposed to in ChallengeList itself
  //because we switch to the challenges tab automatically when there is a new challenge
  const [state, updateState] = useImmer({
    needToRequestChallenges: true,
    challenges: [],
    showChallenges: false,
  });
  useEffect(() => {
    if (state.needToRequestChallenges) {
      updateState((draftState) => {
        draftState.needToRequestChallenges = false;
      });
      socket.emit("requestCurrentChallenges");
    }
  }, [socket, updateState, state.needToRequestChallenges]);
  useEffect(() => {
    socket.once("requestedCurrentChallenges", ({ challenges }) => {
      updateState((draftState) => {
        draftState.challenges = challenges;
        if (draftState.challenges.length > 0) {
          draftState.showChallenges = true;
        }
      });
    });
    socket.on("newChallenge", ({ challenge }) => {
      updateState((draftState) => {
        draftState.challenges.push(challenge);
        if (draftState.challenges.length === 1) {
          draftState.showChallenges = true;
        }
      });
    });
    socket.on("deadChallenge", ({ joinCode }) => {
      updateState((draftState) => {
        for (let i = 0; i < draftState.challenges.length; i += 1) {
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
  if (!state.showChallenges || (canHover && hoveredTab === "recent")) {
    recentGamesStyle.backgroundColor = selectedTabColor;
  }
  if (state.showChallenges || (canHover && hoveredTab === "open")) {
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
              draftState.showChallenges = true;
            });
          }}
          onMouseEnter={() => handleMouseEnter("open")}
          onMouseLeave={handleMouseLeave}
          title={"Players looking for an opponent"}
        >
          {`Challenges (${state.challenges.length})`}
        </div>
        <div
          style={recentGamesStyle}
          onClick={() => {
            updateState((draftState) => {
              draftState.showChallenges = false;
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
      {state.showChallenges && (
        <ChallengeList
          challenges={state.challenges}
          isLargeScreen={isLargeScreen}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn}
          handleAcceptChallenge={handleAcceptChallenge}
        />
      )}
      {!state.showChallenges && (
        <RecentGameList
          recentGames={recentGames}
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
