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
  const createGame = (props) => {
    const params = props.location.state;
    return (
      <GamePage
        duration={params.duration}
        increment={params.increment}
        p1Name={params.p1Name}
      />
    );
  };

  return (
    <Router>
      <Switch>
        <Route path="/lobby" exact>
          <LobbyPage />
        </Route>
        <Route path="/game/:gameId" exact component={createGame} />
        <Redirect to="/lobby" />
      </Switch>
    </Router>
  );
};

export default App;
