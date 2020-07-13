import React from "react";
import "materialize-css";
import { Navbar, Icon, NavItem } from "react-materialize";
import { Link } from "react-router-dom";

function Header(props) {
  let headerText;
  if (props.gameName === "") headerText = "WallWars";
  else headerText = `WallWars    Game ${props.gameName}`;

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
      {props.showLobby && <Link to=".">Lobby</Link>}
      <NavItem onClick={props.showHelp}>Help</NavItem>
      <NavItem onClick={showAbout}>About</NavItem>
    </Navbar>
  );
}

export default Header;
