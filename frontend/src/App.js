import React, { useState } from "react";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";
import socketIoClient from "socket.io-client";

import LobbyPage from "./lobby/LobbyPage";

const App = () => {
  const BACKEND_ENDPOINT =
    process.env.REACT_APP_BACKEND_URL || "localhost:4001";
  console.log(`connecting to backend at ${BACKEND_ENDPOINT}`);
  const [socket] = useState(socketIoClient(BACKEND_ENDPOINT));

  //every route redirects back to '/', which is both the lobby and the game page
  return (
    <React.StrictMode>
      <BrowserRouter>
        <Switch>
          <Route path="/wallwars" exact>
            <LobbyPage socket={socket} />
          </Route>
          <Redirect to="/wallwars" />
        </Switch>
      </BrowserRouter>
    </React.StrictMode>
  );
};

export default App;
