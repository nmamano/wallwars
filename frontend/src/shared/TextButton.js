import React from "react";
import { Button } from "react-materialize";
import { getColor } from "./colorThemes";

const TextButton = ({
  text,
  tooltip,
  onClick,
  menuTheme,
  isDarkModeOn,
  isDisabled,
}) => {
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
};

export default TextButton;
