import * as React from "react";
import { styled } from "@mui/material/styles";
import Menu, { MenuProps } from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { TextButton } from "../shared/Buttons";
import { getColor, MenuThemeName } from "../shared/colorThemes";

// Icons:
import School from "@mui/icons-material/School";
import Face from "@mui/icons-material/Face";
import Outlet from "@mui/icons-material/Outlet";
import Mood from "@mui/icons-material/Mood";
import MoodBad from "@mui/icons-material/MoodBad";
import ChildCare from "@mui/icons-material/ChildCare";
import Pets from "@mui/icons-material/Pets";
import Whatshot from "@mui/icons-material/Whatshot";
import Toys from "@mui/icons-material/Toys";
import Spa from "@mui/icons-material/Spa";
import Stop from "@mui/icons-material/Stop";
import Star from "@mui/icons-material/Star";
import Lens from "@mui/icons-material/Lens";
import Favorite from "@mui/icons-material/Favorite";
import Visibility from "@mui/icons-material/Visibility";
import GroupWork from "@mui/icons-material/GroupWork";
import Flare from "@mui/icons-material/Flare";
import FlashOn from "@mui/icons-material/FlashOn";
import AcUnit from "@mui/icons-material/AcUnit";
import FilterVintage from "@mui/icons-material/FilterVintage";
import Camera from "@mui/icons-material/Camera";
import Casino from "@mui/icons-material/Casino";
import FreeBreakfast from "@mui/icons-material/FreeBreakfast";
import LocalPizza from "@mui/icons-material/LocalPizza";
import MusicNote from "@mui/icons-material/MusicNote";
import DirectionsBoat from "@mui/icons-material/DirectionsBoat";
import DirectionsBus from "@mui/icons-material/DirectionsBus";
import DirectionsCar from "@mui/icons-material/DirectionsCar";
import TwoWheeler from "@mui/icons-material/TwoWheeler";
import EventSeat from "@mui/icons-material/EventSeat";
import Adb from "@mui/icons-material/Adb";
import BugReport from "@mui/icons-material/BugReport";
import SportsMotorsports from "@mui/icons-material/SportsMotorsports";

type tokenIconStr =
  | "default"
  | "school"
  | "face"
  | "outlet"
  | "mood"
  | "mood_bad"
  | "child_care"
  | "pets"
  | "whatshot"
  | "toys"
  | "spa"
  | "stop"
  | "star"
  | "lens"
  | "favorite"
  | "visibility"
  | "group_work"
  | "flare"
  | "flash_on"
  | "ac_unit"
  | "filter_vintage"
  | "camera"
  | "casino"
  | "free_breakfast"
  | "local_pizza"
  | "music_note"
  | "directions_boat"
  | "directions_bus"
  | "directions_car"
  | "two_wheeler"
  | "event_seat"
  | "adb"
  | "bug_report"
  | "sports_motorsports";

function getIcon(icon: tokenIconStr) {
  var res: JSX.Element;
  switch (icon) {
    case "school":
      res = <School />;
      break;
    case "face":
      res = <Face />;
      break;
    case "outlet":
      res = <Outlet />;
      break;
    case "mood":
      res = <Mood />;
      break;
    case "mood_bad":
      res = <MoodBad />;
      break;
    case "child_care":
      res = <ChildCare />;
      break;
    case "pets":
      res = <Pets />;
      break;
    case "whatshot":
      res = <Whatshot />;
      break;
    case "toys":
      res = <Toys />;
      break;
    case "spa":
      res = <Spa />;
      break;
    case "stop":
      res = <Stop />;
      break;
    case "star":
      res = <Star />;
      break;
    case "lens":
      res = <Lens />;
      break;
    case "favorite":
      res = <Favorite />;
      break;
    case "visibility":
      res = <Visibility />;
      break;
    case "group_work":
      res = <GroupWork />;
      break;
    case "flare":
      res = <Flare />;
      break;
    case "flash_on":
      res = <FlashOn />;
      break;
    case "ac_unit":
      res = <AcUnit />;
      break;
    case "filter_vintage":
      res = <FilterVintage />;
      break;
    case "camera":
      res = <Camera />;
      break;
    case "casino":
      res = <Casino />;
      break;
    case "free_breakfast":
      res = <FreeBreakfast />;
      break;
    case "local_pizza":
      res = <LocalPizza />;
      break;
    case "music_note":
      res = <MusicNote />;
      break;
    case "directions_boat":
      res = <DirectionsBoat />;
      break;
    case "directions_bus":
      res = <DirectionsBus />;
      break;
    case "directions_car":
      res = <DirectionsCar />;
      break;
    case "two_wheeler":
      res = <TwoWheeler />;
      break;
    case "event_seat":
      res = <EventSeat />;
      break;
    case "adb":
      res = <Adb />;
      break;
    case "bug_report":
      res = <BugReport />;
      break;
    case "sports_motorsports":
      res = <SportsMotorsports />;
      break;
    case "default":
      res = <Face />;
      break;
    default:
      return <></>;
  }
  res = React.cloneElement(res, {
    size: "large",
    fontSize: "large",
    style: { color: "white", textAlign: "center" },
  });
  return res;
}

// Some icons until we find a nicer set.
const tokens: tokenIconStr[] = [
  "default",
  "school",
  "face",
  "outlet",
  "mood",
  "mood_bad",
  "child_care",
  "pets",
  "whatshot",
  "toys",
  "spa",
  "stop",
  "star",
  "lens",
  "favorite",
  "visibility",
  "group_work",
  "flare",
  "flash_on",
  "ac_unit",
  "filter_vintage",
  "camera",
  "casino",
  "free_breakfast",
  "local_pizza",
  "music_note",
  "directions_boat",
  "directions_bus",
  "directions_car",
  "two_wheeler",
  "event_seat",
  "adb",
  "bug_report",
  "sports_motorsports",
];

const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "right",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "right",
    }}
    {...props}
  />
))(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: 3,
    marginTop: theme.spacing(1),
    minWidth: 90,
    "& .MuiMenu-list": {
      padding: "0px 0",
    },
    "& .MuiMenuItem-root": {
      "& .MuiSvgIcon-root": {
        fontSize: 25,
      },
    },
  },
}));

function dropdownButton(
  onClick: (event: React.MouseEvent<HTMLElement>) => void,
  menuTheme: MenuThemeName,
  isDarkModeOn: boolean
): JSX.Element {
  return (
    <TextButton
      text="Change"
      tooltip="Choose your token"
      menuTheme={menuTheme}
      isDarkModeOn={isDarkModeOn}
      dropdownIcon={true}
      id="dropdown-customized-button"
      onClick={onClick}
    />
  );
}

export default function TokenDropdown(
  anchorEl: HTMLElement | null,
  setAnchorEl: React.Dispatch<React.SetStateAction<HTMLElement | null>>,
  handleToken: (token: string) => void,
  menuTheme: MenuThemeName,
  isDarkModeOn: boolean
) {
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const iconStyle = {
    backgroundColor: getColor(menuTheme, "button", isDarkModeOn),
    width: "100%",
    color: "white",
    height: "36px",
  };

  const defaultToken = (
    <>
      {getIcon("face")}
      {"/"}
      {getIcon("outlet")}
    </>
  );

  return (
    <div>
      {dropdownButton(handleClick, menuTheme, isDarkModeOn)}
      <StyledMenu
        id="demo-customized-menu"
        MenuListProps={{
          "aria-labelledby": "dropdown-customized-button",
        }}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {tokens.map((token) => {
          return (
            <MenuItem
              style={iconStyle}
              key={token}
              onClick={() => {
                handleToken(token);
                handleClose();
              }}
              disableRipple
            >
              {token === "default" ? defaultToken : getIcon(token)}
            </MenuItem>
          );
        })}
      </StyledMenu>
    </div>
  );
}
