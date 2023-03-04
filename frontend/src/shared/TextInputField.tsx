import TextField from "@mui/material/TextField";

export default function TextInputField({
  id,
  value,
  onChange,
  label,
  isInvalid,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  isInvalid?: boolean;
  placeholder?: string;
}) {
  return (
    <TextField
      style={{ minHeight: "42px" }}
      inputProps={{ style: { color: "white", paddingLeft: "7px" } }}
      InputLabelProps={{ style: { color: "white", fontSize: "18px" } }}
      label={label}
      error={isInvalid}
      id={id}
      value={value}
      placeholder={placeholder}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(event.target.value);
      }}
    />
  );
}
