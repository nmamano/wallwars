import React from "react";
import "materialize-css";
import { Navbar, Icon, NavItem } from "react-materialize";

function Header({ gameName, showLobby, endGame, showHelp }) {
  let headerText = "WallWars";
  if (gameName && gameName !== "") headerText += ` Game ${gameName}`;

  const showAbout = () => {
    console.log("todo: show about in modal window");
  };

  return (
    <Navbar
      alignLinks="right"
      brand={<span className="brand-logo">{headerText}</span>}
      centerLogo
      id="mobile-nav"
      menuIcon={<Icon>menu</Icon>}
      options={{
        draggable: true,
        edge: "left",
        inDuration: 250,
        onCloseEnd: null,
        onCloseStart: null,
        onOpenEnd: null,
        onOpenStart: null,
        outDuration: 200,
        preventScrolling: true,
      }}
    >
      {showLobby && <NavItem onClick={endGame}>Lobby</NavItem>}
      <NavItem onClick={showHelp}>Help</NavItem>
      <NavItem onClick={showAbout}>About</NavItem>
    </Navbar>
  );
}

export default Header;
