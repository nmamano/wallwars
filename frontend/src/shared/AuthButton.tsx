import { useAuth0 } from "@auth0/auth0-react";
import IconButton, { IconButtonProps } from "./IconButton";

const AuthButton = ({
  bgColor,
  padding,
  menuTheme,
  isDarkModeOn,
}: Omit<IconButtonProps, "icon" | "tooltip" | "onClick">): JSX.Element => {
  const { loginWithRedirect } = useAuth0();

  return (
    <IconButton
      icon="account_circle"
      tooltip="Login"
      onClick={() => loginWithRedirect()}
      bgColor={bgColor}
      padding={padding}
      menuTheme={menuTheme}
      isDarkModeOn={isDarkModeOn}
    />
  );
};

export default AuthButton;
