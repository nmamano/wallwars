import React from "react";
import "materialize-css";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { ToastContainer, toast, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "./IconButton";
import IconButton from "./IconButton";

function Header({
  gameName,
  showLobby,
  endGame,
  helpText,
  isLargeScreen,
  isDarkModeOn,
}) {
  let brand;
  if (!gameName) {
    brand = <span>WallWars</span>;
  } else {
    brand = (
      <span>
        {isLargeScreen && <span>WallWars&nbsp;&nbsp;</span>}
        <CopyToClipboard
          style={{ cursor: "pointer" }}
          text={gameName}
          onCopy={() =>
            toast("Game code copied to clipboard!", {
              autoClose: 2500,
              hideProgressBar: true,
              transition: Slide,
              pauseOnFocusLoss: false,
            })
          }
        >
          <span>Game {gameName}</span>
        </CopyToClipboard>
      </span>
    );
  }

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

  const color = isDarkModeOn ? "red darken-4" : "red lighten-1";
  const padding = isLargeScreen ? 20 : 10;

  return (
    <div>
      <ToastContainer />
      <div
        className={color}
        style={{
          height: "50px",
          display: "grid",
          gridTemplateRows: "1fr",
          gridTemplateColumns: "auto auto",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: isLargeScreen ? "30px" : "25px",
            marginLeft: isLargeScreen ? "15px" : "5px",
          }}
        >
          {brand}
        </div>
        <div
          style={{
            height: "auto",
            display: "grid",
            padding: "5px",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: `auto`,
            columnGap: "5px",
            rowGap: "5px",
            marginRight: isLargeScreen ? "15px" : "5px",
          }}
        >
          {showLobby ? (
            <IconButton
              icon="home"
              tooltip="Quit game"
              onClick={endGame}
              modalTitle="Return to lobby"
              modalBody="Are you sure you want to return to the lobby? You will not be able to rejoin this game."
              modalConfirmButtonText="Quit game"
              bgColor="red darken-1"
              padding={padding}
            />
          ) : (
            <div></div>
          )}
          <IconButton
            icon="help"
            tooltip="Help"
            modalTitle="Help"
            modalBody={helpText}
            bgColor="red darken-1"
            padding={padding}
          />
          <IconButton
            icon="info"
            tooltip="About"
            modalTitle="About"
            modalBody={aboutText}
            bgColor="red darken-1"
            padding={padding}
          />
        </div>
      </div>
    </div>
  );
}

export default Header;
