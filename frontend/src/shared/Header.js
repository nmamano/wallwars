import React from "react";
import "materialize-css";
import { Navbar, Icon, NavItem, Modal, Button } from "react-materialize";

function Header({ gameName, showLobby, endGame, helpText }) {
  let headerText = "WallWars";
  if (gameName && gameName !== "") headerText += ` Game ${gameName}`;
  const aboutText = (
    <div>
      <h6>
        Wallwars is an online 2-player strategy game. The goal is to get to your
        goal before the opponent gets to hers, building walls to reshape the
        terrain to your advantage.
      </h6>
      <h6>
        It is implemented by Nil M and inspired by a board game he played once
        as a kid, of which he doesn't remember the name, unfortunately.
      </h6>
      <h6>
        The frontend is made with React, and the backend with Node.js, Express,
        and socket.io.
      </h6>
      <h6>
        The source code is available at https://github.com/nmamano/WallWars
      </h6>
    </div>
  );

  return (
    <Navbar
      alignLinks="right"
      brand={<span>{headerText}</span>}
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
      <Modal
        style={{ color: "black" }}
        actions={[
          <Button
            style={{ backgroundColor: "#009688", color: "white" }}
            flat
            modal="close"
            node="button"
            waves="green"
          >
            Close
          </Button>,
        ]}
        bottomSheet={false}
        fixedFooter={false}
        header="Help"
        id="modal1"
        open={false}
        options={{
          dismissible: true,
          endingTop: "10%",
          inDuration: 250,
          opacity: 0.4,
          outDuration: 250,
          preventScrolling: true,
          startingTop: "4%",
        }}
        trigger={<NavItem>Help</NavItem>}
      >
        {helpText}
      </Modal>

      <Modal
        style={{ color: "black" }}
        actions={[
          <Button
            style={{ backgroundColor: "#009688", color: "white" }}
            flat
            modal="close"
            node="button"
            waves="green"
          >
            Close
          </Button>,
        ]}
        bottomSheet={false}
        fixedFooter={false}
        header="About"
        id="modal1"
        open={false}
        options={{
          dismissible: true,
          endingTop: "10%",
          inDuration: 250,
          opacity: 0.4,
          outDuration: 250,
          preventScrolling: true,
          startingTop: "4%",
        }}
        trigger={<NavItem>About</NavItem>}
      >
        {aboutText}
      </Modal>
    </Navbar>
  );
}

export default Header;
