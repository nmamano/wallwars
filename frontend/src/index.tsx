import React from "react";
import ReactDOM from "react-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { CookiesProvider } from "react-cookie";

function AppWrapper() {
  return (
    <React.StrictMode>
      <CookiesProvider>
        <BrowserRouter>
          <Auth0Provider
            domain={process.env.REACT_APP_AUTH0_DOMAIN!}
            clientId={process.env.REACT_APP_AUTH0_CLIENT_ID!}
            authorizationParams={{
              redirect_uri: "https://wallwars.net",
            }}
          >
            <App />
          </Auth0Provider>
        </BrowserRouter>
      </CookiesProvider>
    </React.StrictMode>
  );
}

ReactDOM.render(<AppWrapper />, document.getElementById("root"));
