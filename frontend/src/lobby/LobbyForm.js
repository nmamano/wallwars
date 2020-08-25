import React, { useEffect } from "react";
import { Row, Col, TextInput, Button, Icon, Dropdown } from "react-materialize";

import { getColor } from "../shared/colorThemes";
import showToastNotification from "../shared/showToastNotification";
import TextButton from "../shared/TextButton";

//random icons until I find a nicer set to use
const tokens = [
  "school",
  "default",
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
  "ac_unit",
  "camera",
  "casino",
  "directions_boat",
  "directions_bus",
  "directions_car",
  "event_seat",
  "adb",
  "bug_report",
];

const LobbyForm = ({
  playerName,
  handlePlayerName,
  duration,
  handleDuration,
  increment,
  handleIncrement,
  joinCode,
  handleJoinCode,
  handleCreateGame,
  handleJoinGame,
  handleRefreshName,
  token,
  handleToken,
  isLargeScreen,
  menuTheme,
  isDarkModeOn,
}) => {
  useEffect(() => {
    window.addEventListener("keydown", downHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  });

  const downHandler = ({ key }) => {
    if (key !== "Enter") return;
    if (joinCode.length > 0) handleJoinGame();
    else {
      showToastNotification("Created new game", 5000);
      handleCreateGame();
    }
  };

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
  return (
    <div
      className="container"
      style={{
        marginTop: "2rem",
        backgroundColor: getColor(menuTheme, "container", isDarkModeOn),
      }}
    >
      <Row className="valign-wrapper">
        <Col className="center" s={4} m={4}>
          <span style={{ fontSize: "23px" }}>
            {isLargeScreen ? "Your name:" : "Name:"}
          </span>
        </Col>
        <Col s={6} m={3}>
          <TextInput
            id="nameInput"
            value={playerName}
            onChange={handlePlayerName}
          />
        </Col>
        <Col s={1} m={1}>
          <Button
            node="button"
            waves="light"
            small
            floating
            style={{
              color: "white",
              backgroundColor: getColor(menuTheme, "button", isDarkModeOn),
            }}
            icon={<Icon>refresh</Icon>}
            onClick={handleRefreshName}
            tooltip={"Get a new name"}
          />
        </Col>
        <Col s={1} m={4}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={4} m={4}>
          <span style={{ fontSize: "23px" }}>
            {isLargeScreen ? "Your token:" : "Token:"}
          </span>
        </Col>
        <Col s={3} m={2} className="center">
          {token === "default" ? (
            defaultToken
          ) : (
            <div className={"white-text"} style={{ fontSize: "30px" }}>
              <i
                className={`material-icons white-text`}
                style={{ height: `100%` }}
              >
                {token}
              </i>
            </div>
          )}
        </Col>
        <Col s={4} m={4}>
          <div>
            <Dropdown
              id="Dropdown_6"
              options={{
                alignment: "left",
                autoTrigger: true,
                closeOnClick: true,
                constrainWidth: true,
                container: null,
                coverTrigger: true,
                hover: false,
                inDuration: 150,
                onCloseEnd: null,
                onCloseStart: null,
                onOpenEnd: null,
                onOpenStart: null,
                outDuration: 250,
              }}
              trigger={
                <Button
                  node="button"
                  style={{
                    backgroundColor: getColor(
                      menuTheme,
                      "button",
                      isDarkModeOn
                    ),
                  }}
                >
                  Change
                </Button>
              }
            >
              {tokens.map((token) => {
                return (
                  <div
                    style={{
                      width: "100%",
                      color: "white",
                      backgroundColor: getColor(
                        menuTheme,
                        "button",
                        isDarkModeOn
                      ),
                    }}
                    key={token}
                    node="button"
                    onClick={() => handleToken(token)}
                  >
                    <div
                      className="center"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        padding: "4px 0",
                      }}
                    >
                      {token === "default" ? (
                        defaultToken
                      ) : (
                        <i
                          className={`material-icons white-text`}
                          style={{ height: `100%` }}
                        >
                          {token}
                        </i>
                      )}
                    </div>
                  </div>
                );
              })}
            </Dropdown>
          </div>
        </Col>
        <Col s={1} m={2}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={5} m={4}>
          <TextButton
            text="Create Game"
            onClick={handleCreateGame}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
        </Col>
        <Col s={2} m={2} style={{ paddingRight: "0" }}>
          <TextInput
            id="durationInput"
            label="Duration"
            value={`${duration}`}
            onChange={handleDuration}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}>
          m
        </Col>
        <Col s={2} m={2} style={{ paddingRight: "0" }}>
          <TextInput
            id="incrementInput"
            label="Increment"
            value={`${increment}`}
            onChange={handleIncrement}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}>
          s
        </Col>
        <Col s={1} m={2}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={5} m={4}>
          <TextButton
            text="Join Game"
            onClick={handleJoinGame}
            menuTheme={menuTheme}
            isDarkModeOn={isDarkModeOn}
          />
        </Col>
        <Col s={6} m={5}>
          <TextInput
            id="joinInput"
            placeholder="Write game code here..."
            value={`${joinCode}`}
            onChange={handleJoinCode}
          />
        </Col>
        <Col s={1} m={3}></Col>
      </Row>
    </div>
  );
};

export default LobbyForm;
