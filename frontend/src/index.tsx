import React from "react";
import { createRoot } from "react-dom/client";
import { Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router";
import { CookiesProvider } from "react-cookie";

const url = "https://wallwars.net";

function AppWrapper() {
  if (!import.meta.env.REACT_APP_AUTH0_DOMAIN) {
    console.error("REACT_APP_AUTH0_DOMAIN not set");
    return <div></div>;
  }
  if (!import.meta.env.REACT_APP_AUTH0_CLIENT_ID) {
    console.error("REACT_APP_AUTH0_CLIENT_ID not set");
    return <div></div>;
  }

  return (
    <CookiesProvider>
      <BrowserRouter>
        <Auth0Provider
          domain={import.meta.env.REACT_APP_AUTH0_DOMAIN}
          clientId={import.meta.env.REACT_APP_AUTH0_CLIENT_ID}
          authorizationParams={{
            redirect_uri: url,
          }}
        >
          <App />
        </Auth0Provider>
      </BrowserRouter>
    </CookiesProvider>
  );
}

const rootContainer = document.getElementById("root");
if (!rootContainer) {
  throw new Error("Root container missing in index.html");
}
createRoot(rootContainer).render(<AppWrapper />);
