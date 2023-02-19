import FormSlider from "./FormSlider";
import {
  internalToClassicCoord,
  classicToInternalCoord,
} from "./gameLogicUtils";

export default function CoordinateSlider({
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
}): JSX.Element {
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
}
