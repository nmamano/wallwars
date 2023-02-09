import React, { useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import socketIoClient from "socket.io-client";
import { CookiesProvider } from "react-cookie";

import LobbyPage from "./lobby/LobbyPage";

const App = () => {
  const BACKEND_ENDPOINT =
    process.env.REACT_APP_BACKEND_URL || "localhost:4001";
  console.log(`connecting to backend at ${BACKEND_ENDPOINT}`);
  const [socket] = useState(socketIoClient(BACKEND_ENDPOINT));

  return (
    <React.StrictMode>
      <CookiesProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/wallwars/index.html"
              exact
              element={<LobbyPage socket={socket} />}
            />
            <Route
              path="/wallwars"
              element={<Navigate replace to="/wallwars/index.html" />}
            />
          </Routes>
        </BrowserRouter>
      </CookiesProvider>
    </React.StrictMode>
  );
};

export default App;
