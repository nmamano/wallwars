import React from "react";
import FormSlider from "../shared/FormSlider";
import {
  internalToClassicCoord,
  classicToInternalCoord,
} from "../shared/gameLogicUtils";

const CoordinateSlider = ({
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
      internalToDisplay={internalToClassicCoord}
      displayToInternal={classicToInternalCoord}
    />
  );
};

export default CoordinateSlider;
