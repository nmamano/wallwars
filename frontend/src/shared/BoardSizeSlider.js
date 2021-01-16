import React from "react";
import FormSlider from "../shared/FormSlider";
import {
  internalToClassicBoardSize,
  classicToInternalBoardSize,
} from "../shared/gameLogicUtils";

const BoardSizeSlider = ({
  label,
  min,
  max,
  value,
  onChange,
  menuTheme,
  isDarkModeOn,
}) => {
  return (
    <FormSlider
      label={label}
      min={min}
      max={max}
      value={value}
      onChange={onChange}
      internalToDisplay={internalToClassicBoardSize}
      displayToInternal={classicToInternalBoardSize}
    />
  );
};

export default BoardSizeSlider;
