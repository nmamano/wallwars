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
  isImportant,
}: {
  text: string;
  tooltip?: string;
  onClick: () => void;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  isDisabled?: boolean;
  isImportant?: boolean; // If true, the button takes a more prominent color.
}): JSX.Element {
  return (
    <Tooltip title={tooltip}>
      <Button
        variant="contained"
        style={{
          backgroundColor: getColor(
            menuTheme,
            isImportant ? "importantButton" : "button",
            isDarkModeOn
          ),
          color: "#FFFFFF",
        }}
        onClick={onClick}
        disabled={isDisabled}
        size={isImportant ? "large" : "medium"}
      >
        {text}
      </Button>
    </Tooltip>
  );
}
