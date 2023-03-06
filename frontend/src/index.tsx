import ReactDOM from "react-dom";
import { Auth0Provider } from "@auth0/auth0-react";

import "./index.css";
import App from "./App";

ReactDOM.render(
  <Auth0Provider
    domain={process.env.REACT_APP_AUTH0_DOMAIN!}
    clientId={process.env.REACT_APP_AUTH0_CLIENT_ID!}
    authorizationParams={{
      redirect_uri: "http://localhost:3000", // will cause let wallwars access to your wallwars account page while localhost
    }}
  >
    <App />
  </Auth0Provider>,
  document.getElementById("root")
);
