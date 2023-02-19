import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";
import wNumb from "wnumb";

export default function FormSlider({
  label,
  min,
  max,
  value,
  onChange,
  internalToDisplay,
  displayToInternal,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  internalToDisplay: (internalCoord: number) => number;
  displayToInternal: (classicCoord: number) => number;
}): JSX.Element {
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
        // connect="lower" // Removed until we can change the color.
        // @ts-ignore
        onChange={(value: number) => {
          onChange(displayToInternal(value));
        }}
      />
    </div>
  );
}
