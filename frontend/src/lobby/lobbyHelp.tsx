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
    <h6>
      The source code is available at{" "}
      <a
        href="https://github.com/nmamano/WallWars"
        target="_blank"
        rel="noopener noreferrer"
      >
        github.com/nmamano/WallWars
      </a>
    </h6>
  </div>
);

export const eloIdAboutText = (
  <div>
    <h6>
      <b>WARNING:</b> do NOT use a password that you use in another website as
      your ELO id. Your ELO id is not shown to other players, but it is also not
      treated securely like a password should.
    </h6>
    <h6>
      ELO ratings are a system used to measure the strength of players based on
      their game record. Players gain ELO points for winning games and lose ELO
      points for losing games. How many ELO points you gain or lose depends on
      the ELO ratings of the opponent.
    </h6>
    <h6>
      Since WallWars does not have an account system, ELO ratings cannot be
      linked to player accounts. Instead, ELO ids allow players to keep their
      ELO ratings across sessions and devices. All games played with the same
      ELO id count toward the same ELO ratings, even if the player name changes.
    </h6>
    <h6>
      The lobby has an ELO ranking. The ELO rating for each ELO id appears in
      the ranking. However, the ELO id itself is secret. Instead, the last name
      player used with that ELO id is shown. If you want to be ranked fairly,
      always use the same ELO id when playing (and, conversely, if you do not
      want a game to count towards your rating, you can leave the ELO id empty).
    </h6>
    <h6>
      WallWars saves your ELO id in a cookie so that next time you play, it will
      automatically be filled for you. However, in case the cookie is deleted,
      if you care about your rating, it is strongly recommended to write down
      your ELO id outside the WallWars website. You will also need to remember
      your ELO id if you want to use it in a different device or browser.
    </h6>
    <h6>
      The ELO id can be anything, so you can change it to something that is easy
      to remember. However, it should not be easy to guess or use by chance by
      other players (like your name), or they could affect your ELO rating.
    </h6>
  </div>
);
