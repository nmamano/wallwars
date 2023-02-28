import Button from "@mui/material/Button";
import { MenuThemeName } from "./colorThemes";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { TextButton } from "./Buttons";

export function NewDialog({
  title,
  body,
  acceptButtonText,
  rejectButtonText,
  isOpen,
  callback,
  menuTheme,
  isDarkModeOn,
}: {
  title: string;
  body: string;
  acceptButtonText?: string; // Defaults to Accept.
  rejectButtonText?: string; // Defaults to Cancel.
  isOpen: boolean;
  callback: (accepted: boolean) => void;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
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
        <Button onClick={() => callback(false)}>
          {rejectButtonText || "Cancel"}
        </Button>
        <TextButton
          text={acceptButtonText || "Accept"}
          onClick={() => callback(true)}
          menuTheme={menuTheme}
          isDarkModeOn={isDarkModeOn || false}
        />
      </DialogActions>
    </Dialog>
  );
}
