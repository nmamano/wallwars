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
  const { loginWithRedirect } = useAuth0();
  const [isLoggedIn] = useState(false);

  let icon: IconStr;
  let tooltip: string;
  if (isLoggedIn) {
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
