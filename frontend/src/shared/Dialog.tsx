import { useState } from "react";
import Button from "@mui/material/Button";
import { MenuThemeName } from "./colorThemes";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { TextButton } from "./Buttons";
import TextInputField from "../shared/TextInputField";

// A dialog to choose whether to accept an action or not.
export function BooleanDialog({
  title,
  body,
  acceptButtonText,
  rejectButtonText,
  isOpen,
  menuTheme,
  isDarkModeOn,
  callback,
}: {
  title: string;
  body: string;
  acceptButtonText: string;
  rejectButtonText: string;
  isOpen: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  callback: (accepted: boolean) => void;
}): JSX.Element {
  return (
    <Dialog open={isOpen} onClose={() => callback(false)}>
      <DialogTitle variant="h5" style={{ color: "black" }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText style={{ color: "black" }}>{body}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => callback(false)}>{rejectButtonText}</Button>
        <TextButton
          text={acceptButtonText}
          onClick={() => callback(true)}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn || false}
        />
      </DialogActions>
    </Dialog>
  );
}

export function TextFieldDialog({
  isOpen,
  setIsOpen,
  title,
  body,
  menuTheme,
  isDarkModeOn,
  maxInputLen,
  onClick,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  title: string;
  body: string;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  maxInputLen: number;
  onClick: (text: string) => void; // Triggered when confirming the dialog.
}): JSX.Element {
  const [textFieldInput, setTextFieldInput] = useState<string>("");
  const setTextFieldInputWithLimit = (text: string): void => {
    setTextFieldInput(text.substring(0, maxInputLen));
  };

  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)}>
      <DialogTitle variant="h5" style={{ color: "black" }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText style={{ color: "black" }}>{body}</DialogContentText>
        <TextInputField
          id="text_field_input"
          value={textFieldInput}
          onChange={setTextFieldInputWithLimit}
          blackText={true}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setIsOpen(false)}>Cancel</Button>
        <TextButton
          text="Accept"
          onClick={() => {
            setIsOpen(false);
            onClick(textFieldInput);
          }}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn || false}
        />
      </DialogActions>
    </Dialog>
  );
}
