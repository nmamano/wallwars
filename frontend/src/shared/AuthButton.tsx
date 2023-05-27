import { useAuth0 } from "@auth0/auth0-react";
import { IconStr, IconButtonWithTooltip } from "./Buttons";

export default function AuthButton({
  bgColor,
  horizontalPadding,
  handleIdToken,
}: {
  bgColor: string;
  horizontalPadding: number;
  handleIdToken: (idToken: string) => void;
}): JSX.Element {
  const [loggedInIcon, loggedOutIcon]: [IconStr, IconStr] = [
    "account_circle",
    "account_circle_outlined",
  ];
  const [loggedInTooltip, loggedOutTooltip]: [string, string] = [
    "Log in",
    "Profile",
  ];

  const { user, error, isAuthenticated, loginWithRedirect } = useAuth0();

  if (error) {
    console.log("There was an error while authenticating:\n", error);
  } else if (isAuthenticated) {
    handleIdToken(user?.sub ? user!.sub : ""); // user.sub is the id token.
    console.log("user:\n", user);
  }
  return (
    <IconButtonWithTooltip
      icon={isAuthenticated ? loggedInIcon : loggedOutIcon}
      tooltip={isAuthenticated ? loggedInTooltip : loggedOutTooltip}
      bgColor={bgColor}
      horizontalPadding={horizontalPadding}
      onClick={loginWithRedirect}
    />
  );
}
