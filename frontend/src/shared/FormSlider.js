import React from "react";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";
import wNumb from "wnumb";
// import { getColor } from "./colorThemes";

const FormSlider = ({
  label,
  min,
  max,
  value,
  onChange,
  internalToDisplay,
  displayToInternal,
  menuTheme,
  isDarkModeOn,
}) => {
  return (
    <div>
      <span style={{ fontSize: "15px" }}>{label}</span>
      <Nouislider
        style={{
          marginBottom: "12px",
        }}
        range={{
          min: internalToDisplay(min),
          max: internalToDisplay(max),
        }}
        start={[internalToDisplay(value)]}
        step={1}
        tooltips={[wNumb({ decimals: 0 })]}
        // connect="lower" //removed until we can change the color
        onChange={(value) => {
          onChange(displayToInternal(value));
        }}
      />
    </div>
  );
};

export default FormSlider;
