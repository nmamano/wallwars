import Button from "@mui/material/Button";
import { MenuThemeName } from "./colorThemes";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { TextButton } from "./Buttons";

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
