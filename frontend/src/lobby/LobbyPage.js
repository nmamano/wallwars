import React from "react";

import Header from "../shared/Header";

const LobbyPage = () => {
  const showHelp = () => {
    console.log("todo: show lobby help in modal window");
  };
  return (
    <div>
      <Header gameName={""} showHelp={showHelp} />
      <h2>This is the lobby page</h2>;
    </div>
  );
};

export default LobbyPage;
