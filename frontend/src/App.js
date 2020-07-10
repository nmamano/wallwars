import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Redirect,
  Switch,
} from "react-router-dom";

import LobbyPage from "./lobby/LobbyPage";
import GamePage from "./game/GamePage";

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/lobby" exact>
          <LobbyPage />
        </Route>
        <Route path="/game/:gameId" exact>
          <GamePage />
        </Route>
        <Redirect to="/lobby" />
      </Switch>
    </Router>
  );
};

export default App;
