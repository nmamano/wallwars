import React from "react";

const LobbyHelp = () => (
  <div>
    <h6>
      This is the lobby. Here, you can create games that your friends can join,
      or join a friend's game.
    </h6>
    <h6>
      When you create a game, you can choose the <em>duration</em> (the time
      that each player has) and a time<em>increment</em> that is added to each
      player after they move.
    </h6>
    <h6>
      Once you create a game, a <em>game code</em> will appear in the top
      header. Share this code with your friend to play with them.
    </h6>
    <h6>
      To join a friend's game, write the code they give you in the box next to
      the "Join game" button and click it.
    </h6>
    <h6>
      A random <em>username</em> has been chosen for you, but you can change it.
    </h6>
  </div>
);

export default LobbyHelp;
