import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";
import { IconStr } from "./Buttons";
import { IconButtonWithTooltip } from "./Buttons";

const AuthButton = ({
  bgColor,
  horizontalPadding,
}: {
  bgColor: string;
  horizontalPadding: number;
}): JSX.Element => {
  const { user, error, isAuthenticated, loginWithRedirect } = useAuth0();
  console.log("user: ", user);
  console.log("error: ", error);

  let icon: IconStr;
  let tooltip: string;
  if (isAuthenticated) {
    tooltip = "Profile";
    icon = "account_circle";
  } else {
    tooltip = "Login";
    icon = "account_circle_outlined";
  }

  return (
    <IconButtonWithTooltip
      icon={icon}
      tooltip={tooltip}
      bgColor={bgColor}
      horizontalPadding={horizontalPadding}
      onClick={() => loginWithRedirect()}
    ></IconButtonWithTooltip>
  );
};

export default AuthButton;
