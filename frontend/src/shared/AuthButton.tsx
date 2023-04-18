import { useAuth0 } from "@auth0/auth0-react";
import { IconStr } from "./Buttons";
import { IconButtonWithTooltip } from "./Buttons";
import { useState } from "react";

const setLoggedIn = (): [IconStr, string] => {
  const icon = "account_circle";
  const tooltip = "Log In";

  return [icon, tooltip];
};

const setLoggedOut = (): [IconStr, string] => {
  const icon = "account_circle_outlined";
  const tooltip = "Profile";

  return [icon, tooltip];
};

const AuthButton = ({
  bgColor,
  horizontalPadding,
  handleIdToken,
}: {
  bgColor: string;
  horizontalPadding: number;
  handleIdToken: (idToken: string) => void;
}): JSX.Element => {
  let [icon, tooltip] = setLoggedOut();

  const { user, error, isAuthenticated, loginWithRedirect } = useAuth0();

  if (error) {
    console.log("There was an error while authenticating:\n", error);
  } else if (isAuthenticated) {
    // [icon, tooltip] = setLoggedIn();
    handleIdToken(user?.sub ? user!.sub : "");
    console.log("user:\n", user);
  }
  const [loggedIn, setLoggedIn] = useState(false);
  return (
    <IconButtonWithTooltip
      icon={icon}
      tooltip={tooltip}
      bgColor={bgColor}
      horizontalPadding={horizontalPadding}
      onClick={() => /*loginWithRedirect()*/ {
        // for testing purposes
        if (!loggedIn) {
          const testToken = `Auth0|${Math.random().toString()}`;
          handleIdToken(testToken);
          setLoggedIn(true);
        } else {
          handleIdToken("");
          setLoggedIn(false);
        }
      }}
    ></IconButtonWithTooltip>
  );
};

export default AuthButton;
