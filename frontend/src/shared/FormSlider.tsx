import * as React from "react";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";
import wNumb from "wnumb";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import MuiInput from "@mui/material/Input";

export function OldFormSlider({
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

const Input = styled(MuiInput)`
  width: 42px;
`;

export function FormSlider({
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
    <Box sx={{ width: 150 }}>
      <Typography id="input-slider" gutterBottom>
        {label}
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item style={{ padding: "0px" }} xs>
          <Slider
            value={value}
            onChange={(_: Event, value: number | number[]) => {
              onChange(value as number);
            }}
            aria-labelledby="input-slider"
            min={min}
            max={max}
          />
        </Grid>
        <Grid item style={{ padding: "0px", paddingLeft: "20px" }}>
          <Input
            value={value}
            size="small"
            style={{ color: "white" }}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              onChange(
                event.target.value === "" ? min : Number(event.target.value)
              );
            }}
            onBlur={() => {
              if (value < min) {
                onChange(min);
              } else if (value > max) {
                onChange(max);
              }
            }}
            inputProps={{
              step: 1,
              min: min,
              max: max,
              type: "number",
              "aria-labelledby": "input-slider",
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
