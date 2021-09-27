import React from "react";

export const lobbyHelpText = (
  <div>
    <h6>
      This is the lobby. From here, you can create games that your friends can
      join, or join a friend's game.
    </h6>
    <h6>
      When you create a game, you can choose the <em>duration</em> (per player)
      and a time <em>increment</em> that is added to each player after they
      move, among other settings. Once you create a game, a <em>join code</em>{" "}
      will appear at the top. Share this code with your friend to play with
      them. In addition, if you select the "Public" game option, anyone will be
      able to see and join your game.
    </h6>
    <h6>
      You can find public games to join in the <em>Open Challenges</em> tab in
      the lobby. To join a private game from a friend, write the code they give
      you in the box next to the <em>Join Game</em> button and click it.
    </h6>
    <h6>
      To get a feel for the game, you can watch some of the recent games listed
      in the <em>Recente Games</em> tab in the lobby.
    </h6>
    <h6>
      A random <em>player name</em> has been chosen for you, but you can change
      it. You can also choose the look of your token.
    </h6>
  </div>
);

export const aboutText = (
  <div>
    <h6>
      Wallwars is an online 2-player strategy board game. The player who gets to
      their goal before first wins. You can place walls to reshape the terrain
      to your advantage.
    </h6>
    <h6>
      WallWars is inspired by board games like Blockade and Quoridor. The main
      difference is that in WallWars there is no limit to how many walls you can
      place, and moves are more flexible (for instance, you can move and place a
      wall in the same turn).
    </h6>
    <h6>The source code is available at https://github.com/nmamano/WallWars</h6>
  </div>
);

export const eloIdAboutText = (
  <div>
    <h6>
      All games played with the same ELO id get an ELO rating. The rating
      appears in the ranking under the name last used with this ELO id. If you
      want to be ranked fairly, always use the same ELO id when playing.
      Conversely, if you don't want a game to influence your ranking, change the
      ELO id to something different.
    </h6>
    <h6>
      <b>WARNING:</b> do NOT use a password that you use in another website as
      the ELO id. Your ELO id is not shown to other players, but it is not
      treated securely like a password.
    </h6>
  </div>
);
