import React, { useState } from "react";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";
import socketIoClient from "socket.io-client";

import LobbyPage from "./lobby/LobbyPage";

const App = () => {
  const BACKEND_ENDPOINT = "localhost:4001"; //placeholder
  const [socket] = useState(socketIoClient(BACKEND_ENDPOINT));

  //every route redirects back to '/', which is both the lobby and the game page
  return (
    <React.StrictMode>
      <BrowserRouter>
        <Switch>
          <Route path="/" exact>
            <LobbyPage socket={socket} />
          </Route>
          <Redirect to="/" />
        </Switch>
      </BrowserRouter>
    </React.StrictMode>
  );
};

export default App;
