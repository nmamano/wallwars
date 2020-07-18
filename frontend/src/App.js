import React from "react";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";
import LobbyPage from "./lobby/LobbyPage";

const App = () => {
  //every route redirects back to '/', which is both the lobby and the game page
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/" exact>
          <LobbyPage />
        </Route>
        <Redirect to="/" />
      </Switch>
    </BrowserRouter>
  );
};

export default App;
