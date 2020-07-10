import React from "react";
import { useParams } from "react-router-dom";

import Header from "../shared/Header";

const GamePage = () => {
  const gameId = useParams().gameId;
  const showHelp = () => {
    console.log("todo: show game help in modal window");
  };
  return (
    <div>
      <Header gameName={gameId} showHelp={showHelp} />
      <h2>This is the game page</h2>;
    </div>
  );
};

export default GamePage;
