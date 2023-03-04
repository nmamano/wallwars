import ReactDOM from "react-dom";
import { Auth0Provider } from "@auth0/auth0-react";

import "./index.css";
import App from "./App";

ReactDOM.render(
  <Auth0Provider
    domain={"dev-l7k7kmidqclptw4l.us.auth0.com"}
    clientId={"Afvfy92FTCakhMDe8hf6Uv9mL0jsunYN"}
    authorizationParams={{
      redirect_uri: "https://professcore.com",
    }}
  >
    <App />
  </Auth0Provider>,
  document.getElementById("root")
);
