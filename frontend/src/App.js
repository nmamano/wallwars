import React from "react";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";
import LobbyPage from "./lobby/LobbyPage";
import GamePage from "./game/GamePage";

const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/lobby" exact>
          <LobbyPage />
        </Route>
        <Route path="/game/:gameId" exact component={GamePage} />
        <Redirect to="/lobby" />
      </Switch>
    </BrowserRouter>
  );
};

export default App;
