import React from "react";
import FormSlider from "./FormSlider";
import {
  internalToClassicBoardSize,
  classicToInternalBoardSize,
} from "./gameLogicUtils";

export default function BoardSizeSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
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
}
