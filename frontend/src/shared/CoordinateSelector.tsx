import * as React from "react";
import { FormSlider } from "./FormSlider";

export default function CoordinateSelector({
  label,
  labelWidth,
  rowLabel,
  colLabel,
  row,
  col,
  rowMin,
  rowMax,
  colMin,
  colMax,
  handleRow,
  handleCol,
  ToDisplay,
  FromDisplay,
}: {
  label: string;
  labelWidth: string;
  rowLabel?: string; // Defaults to "Row:"
  colLabel?: string; // Defaults to "Column:"
  row: number;
  col: number;
  handleRow: (value: number) => void;
  handleCol: (value: number) => void;
  rowMin: number;
  rowMax: number;
  colMin: number;
  colMax: number;
  // A mapping indicating how to display the values.
  ToDisplay: (value: number) => number;
  // Mapping a displayed value back to the actual value. Reverse of `ToDisplay`.
  FromDisplay: (displayValue: number) => number;
}): JSX.Element {
  const horizontalSep = <span style={{ paddingLeft: "20px" }}></span>;
  return (
    <div style={{ display: "flex", alignItems: "center", paddingTop: "20px" }}>
      {horizontalSep}
      <span
        style={{
          fontSize: "20px",
          width: labelWidth,
        }}
      >
        {label}
      </span>
      {horizontalSep}
      {horizontalSep}
      <FormSlider
        label={rowLabel || "Row:"}
        min={ToDisplay(rowMin)}
        max={ToDisplay(rowMax)}
        value={ToDisplay(row)}
        onChange={(value: number) => {
          handleRow(FromDisplay(value));
        }}
      />
      {horizontalSep}
      {horizontalSep}
      <FormSlider
        label={colLabel || "Column:"}
        min={ToDisplay(colMin)}
        max={ToDisplay(colMax)}
        value={ToDisplay(col)}
        onChange={(value: number) => {
          handleCol(FromDisplay(value));
        }}
      />
    </div>
  );
}
