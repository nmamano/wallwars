import React from "react";
import ReactDOM from "react-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { CookiesProvider } from "react-cookie";

const url = "https://wallwars.net";

function AppWrapper() {
  if (!process.env.REACT_APP_AUTH0_DOMAIN) {
    console.error("REACT_APP_AUTH0_DOMAIN not set");
    return <div></div>;
  }
  if (!process.env.REACT_APP_AUTH0_CLIENT_ID) {
    console.error("REACT_APP_AUTH0_CLIENT_ID not set");
    return <div></div>;
  }

  return (
    <React.StrictMode>
      <CookiesProvider>
        <BrowserRouter>
          <Auth0Provider
            domain={process.env.REACT_APP_AUTH0_DOMAIN}
            clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
            authorizationParams={{
              redirect_uri: url,
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
