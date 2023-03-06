import * as React from "react";
import { getColor, MenuThemeName } from "./colorThemes";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// Icons:
import Flag from "@mui/icons-material/Flag";
import LocalFlorist from "@mui/icons-material/LocalFlorist";
import Replay from "@mui/icons-material/Replay";
import AddAlarm from "@mui/icons-material/AddAlarm";
import FastRewind from "@mui/icons-material/FastRewind";
import NavigateBefore from "@mui/icons-material/NavigateBefore";
import NavigateNext from "@mui/icons-material/NavigateNext";
import FastForward from "@mui/icons-material/FastForward";
import VolumeUp from "@mui/icons-material/VolumeUp";
import VolumeOff from "@mui/icons-material/VolumeOff";
import ZoomOut from "@mui/icons-material/ZoomOut";
import ZoomIn from "@mui/icons-material/ZoomIn";
import Home from "@mui/icons-material/Home";
import ColorLens from "@mui/icons-material/ColorLens";
import WbSunny from "@mui/icons-material/WbSunny";
import Brightness2 from "@mui/icons-material/Brightness2";
import Help from "@mui/icons-material/Help";
import Info from "@mui/icons-material/Info";
import AccountCircle from "@mui/icons-material/AccountCircle";
import { AccountCircleOutlined } from "@mui/icons-material";
import Refresh from "@mui/icons-material/Refresh";

export type IconStr =
  | "flag"
  | "local_florist"
  | "replay"
  | "add_alarm"
  | "fast_rewind"
  | "navigate_before"
  | "navigate_next"
  | "fast_forward"
  | "volume_up"
  | "volume_off"
  | "zoom_out"
  | "zoom_in"
  | "home"
  | "color_lens"
  | "wb_sunny"
  | "brightness_2"
  | "help"
  | "info"
  | "account_circle"
  | "account_circle_outlined"
  | "refresh";

function getIcon(icon: IconStr): JSX.Element {
  switch (icon) {
    case "flag":
      return <Flag />;
    case "local_florist":
      return <LocalFlorist />;
    case "replay":
      return <Replay />;
    case "add_alarm":
      return <AddAlarm />;
    case "fast_rewind":
      return <FastRewind />;
    case "navigate_before":
      return <NavigateBefore />;
    case "navigate_next":
      return <NavigateNext />;
    case "fast_forward":
      return <FastForward />;
    case "volume_up":
      return <VolumeUp />;
    case "volume_off":
      return <VolumeOff />;
    case "zoom_out":
      return <ZoomOut />;
    case "zoom_in":
      return <ZoomIn />;
    case "home":
      return <Home />;
    case "color_lens":
      return <ColorLens />;
    case "wb_sunny":
      return <WbSunny />;
    case "brightness_2":
      return <Brightness2 />;
    case "help":
      return <Help />;
    case "info":
      return <Info />;
    case "account_circle":
      return <AccountCircle />;
    case "account_circle_outlined":
      return <AccountCircleOutlined />;
    case "refresh":
      return <Refresh />;
    default:
      return <></>;
  }
}

export function TextButton({
  text,
  tooltip,
  menuTheme,
  isDarkModeOn,
  disabled,
  isImportant,
  dropdownIcon,
  id,
  onClick,
}: {
  text: string;
  tooltip?: string;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  disabled?: boolean;
  isImportant?: boolean; // If true, the button takes a more prominent color.
  dropdownIcon?: boolean; // If true, shows a little dropdown arrow to the right of the text.
  id?: string;
  onClick: (() => void) | ((event: React.MouseEvent<HTMLElement>) => void);
}): JSX.Element {
  const bgColor = getColor(
    menuTheme!,
    isImportant ? "importantButton" : "button",
    isDarkModeOn || false
  );
  const style = {
    backgroundColor: disabled ? "lightgray" : bgColor,
    color: disabled ? "gray" : "white",
  };
  if (disabled)
    return (
      <Button
        id={id}
        variant="contained"
        style={style}
        onClick={onClick}
        disabled={true}
        size={isImportant ? "large" : "medium"}
        endIcon={dropdownIcon ? <KeyboardArrowDownIcon /> : undefined}
      >
        {text}
      </Button>
    );
  return (
    <Tooltip title={tooltip}>
      <Button
        id={id}
        variant="contained"
        style={style}
        onClick={onClick}
        disabled={false}
        size={isImportant ? "large" : "medium"}
        endIcon={dropdownIcon ? <KeyboardArrowDownIcon /> : undefined}
      >
        {text}
      </Button>
    </Tooltip>
  );
}

export function IconButtonWithTooltip({
  icon,
  tooltip,
  bgColor,
  disabled,
  menuTheme,
  isDarkModeOn,
  horizontalPadding,
  circular,
  onClick,
}: {
  icon: IconStr;
  tooltip: string;
  bgColor?: string; // If not provided, uses the button color based on `menuTheme` and `isDarkModeOn`.
  menuTheme?: MenuThemeName; // Omit if `bgColor` is provided.
  isDarkModeOn?: boolean; // Omit if `bgColor` is provided.
  disabled?: boolean;
  horizontalPadding?: number;
  circular?: boolean;
  onClick: () => void;
}): JSX.Element {
  if (!bgColor) bgColor = getColor(menuTheme!, "button", isDarkModeOn || false);
  const style = {
    backgroundColor: disabled ? "lightgray" : bgColor,
    color: disabled ? "gray" : "white",
    padding: `0px ${horizontalPadding}px`,
    height: "36px", // All buttons have a consistent height across the app.
    width: circular ? "36px" : "auto",
  };
  const sx = {
    boxShadow: 1,
    borderRadius: circular ? 50 : 1,
  };
  if (disabled) {
    return (
      <IconButton
        style={style}
        sx={sx}
        onClick={onClick}
        disabled={true}
        centerRipple={false}
        size="small"
      >
        {getIcon(icon)}
      </IconButton>
    );
  }
  return (
    <Tooltip title={tooltip}>
      <IconButton
        style={style}
        sx={sx}
        onClick={onClick}
        disabled={false}
        centerRipple={false}
        size="small"
      >
        {getIcon(icon)}
      </IconButton>
    </Tooltip>
  );
}

// When you click this button, an informational modal pops up that you need to dismiss by clicking
// "close". For example, this is used when clicking the "info" and "help" icon buttons in the
// header.
export function IconButtonWithInfoModal({
  icon,
  tooltip,
  bgColor,
  menuTheme,
  isDarkModeOn,
  disabled,
  horizontalPadding,
  circular,
  modalTitle,
  modalBody,
}: {
  icon: IconStr;
  tooltip: string;
  bgColor?: string; // If not provided, uses the button color based on `menuTheme` and `isDarkModeOn`.
  menuTheme?: MenuThemeName; // Omit if `bgColor` is provided.
  isDarkModeOn?: boolean; // Omit if `bgColor` is provided.
  disabled?: boolean;
  horizontalPadding?: number;
  circular?: boolean;
  modalTitle: string;
  modalBody: JSX.Element | string;
}): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);
  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  const modalBoxStyle = {
    position: "absolute" as "absolute",
    top: "30%",
    left: "30%",
    transform: "translate(-30%, -30%)",
    maxWidth: 800,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
    color: "black",
    overflow: "scroll",
    maxHeight: "80%",
  };

  return (
    <>
      <IconButtonWithTooltip
        icon={icon}
        tooltip={tooltip}
        bgColor={bgColor}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        disabled={disabled}
        horizontalPadding={horizontalPadding}
        circular={circular}
        onClick={handleOpen}
      />
      <Modal open={isOpen} onClose={handleClose}>
        <Box sx={modalBoxStyle}>
          <Typography variant="h4">{modalTitle}</Typography>
          {modalBody}
        </Box>
      </Modal>
    </>
  );
}

export function IconButtonWithDialog({
  icon,
  tooltip,
  disabled,
  menuTheme,
  isDarkModeOn,
  modalTitle,
  modalBody,
  modalConfirmButtonText,
  onClick,
}: {
  icon: IconStr;
  tooltip: string;
  disabled?: boolean;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
  modalTitle: string;
  modalBody: string;
  modalConfirmButtonText: string;
  onClick: () => void; // Action triggered when confirming the dialog.
}): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);
  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);
  return (
    <>
      <IconButtonWithTooltip
        icon={icon}
        tooltip={tooltip}
        disabled={disabled}
        menuTheme={menuTheme}
        isDarkModeOn={isDarkModeOn}
        onClick={handleOpen}
      />
      <Dialog open={isOpen} onClose={handleClose}>
        <DialogTitle variant="h5" style={{ color: "black" }}>
          {modalTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: "black" }}>
            {modalBody}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <TextButton
            text={modalConfirmButtonText}
            onClick={() => {
              handleClose();
              onClick();
            }}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn || false}
          />
        </DialogActions>
      </Dialog>
    </>
  );
}
