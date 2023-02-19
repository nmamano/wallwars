import { Button } from "react-materialize";
import { getColor, MenuThemeName } from "./colorThemes";

function TextButton({
  text,
  tooltip,
  onClick,
  menuTheme,
  isDarkModeOn,
  isDisabled,
}: {
  text: string;
  tooltip?: string;
  onClick: () => void;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  isDisabled?: boolean;
}): JSX.Element {
  return (
    <Button
      style={{
        backgroundColor: getColor(menuTheme, "button", isDarkModeOn),
        color: "#FFFFFF",
      }}
      node="button"
      waves="light"
      onClick={onClick}
      tooltip={tooltip}
      disabled={isDisabled}
    >
      {text}
    </Button>
  );
}

export default TextButton;
