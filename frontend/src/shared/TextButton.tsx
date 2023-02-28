import { getColor, MenuThemeName } from "./colorThemes";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";

export default function TextButton({
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
    <Tooltip title={tooltip}>
      <Button
        variant="contained"
        style={{
          backgroundColor: getColor(menuTheme, "button", isDarkModeOn),
          color: "#FFFFFF",
        }}
        onClick={onClick}
        disabled={isDisabled}
      >
        {text}
      </Button>
    </Tooltip>
  );
}
