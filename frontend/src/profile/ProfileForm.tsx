import { useState } from "react";
import { AppState } from "../App";
import { getColor } from "../shared/colorThemes";
import Grid from "@mui/material/Grid";
import { TextButtonWithTextField } from "../shared/Buttons";
import TokenDropdown from "./TokenDropdown";

export default function ProfileForm({
  appState,
  isLargeScreen,
  handlePlayerName,
  handleToken,
}: {
  appState: AppState;
  isLargeScreen: boolean;
  handlePlayerName: (name: string) => void;
  handleToken: (token: string) => void;
}): JSX.Element {
  const menuTheme = appState.menuTheme;
  const isDarkModeOn = appState.isDarkModeOn;

  const defaultToken = (
    <div style={{ fontSize: "30px" }}>
      <i className={`material-icons white-text`} style={{ height: `100%` }}>
        face
      </i>
      {isLargeScreen ? " / " : "/"}
      <i className={`material-icons white-text`} style={{ height: `100%` }}>
        outlet
      </i>
    </div>
  );
  const customToken = (
    <span className={"white-text"} style={{ fontSize: "30px" }}>
      <i className={`material-icons white-text`} style={{ height: `100%` }}>
        {appState.token}
      </i>
    </span>
  );

  const [tokenDropdownAnchorEl, setTokenDropdownAnchorEl] =
    useState<null | HTMLElement>(null);

  const isLoggedIn = appState.idToken !== "";

  // Same styling as the lobby form.
  const gridItemStyle = {
    paddingLeft: "10px",
    paddingRight: "10px",
    paddingTop: "15px",
    paddingBottom: "15px",
  };

  return (
    <div
      style={{
        marginTop: "2rem",
        paddingBottom: "0.6rem",
        maxWidth: isLargeScreen ? "60%" : "80%",
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "left",
        backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
      }}
    >
      <Grid
        container
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        textAlign="center"
        spacing={0}
      >
        <Grid item style={gridItemStyle} xs={4}>
          <div style={gridItemStyle}>
            <TextButtonWithTextField
              baseButtonText="Change Name"
              tooltip={
                isLoggedIn ? "Change your name." : "Log in to change your name."
              }
              disabled={!isLoggedIn}
              menuTheme={menuTheme}
              isDarkModeOn={isDarkModeOn}
              modalTitle="Name change"
              modalBody="Enter your new name:"
              onClick={handlePlayerName}
              maxInputLen={15}
            />
          </div>
        </Grid>
      </Grid>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            paddingLeft: "20px",
            paddingRight: "20px",
            fontSize: "20px",
          }}
        >
          {isLargeScreen ? "Your token:" : "Token:"}
        </span>
        {appState.token === "default" ? defaultToken : customToken}
        <span style={{ paddingLeft: "20px" }}></span>
        {TokenDropdown(
          tokenDropdownAnchorEl,
          setTokenDropdownAnchorEl,
          handleToken,
          menuTheme,
          isDarkModeOn
        )}
      </div>
    </div>
  );
}
