import React, { useEffect } from "react";
import {
  Row,
  Col,
  TextInput,
  Button,
  Icon,
  Dropdown,
  Checkbox,
  Switch,
} from "react-materialize";
import { getColor } from "../shared/colorThemes";
import showToastNotification from "../shared/showToastNotification";
import TextButton from "../shared/TextButton";
import { maxBoardDims } from "../shared/globalSettings";
import CoordinateSlider from "../shared/CoordinateSlider";
import BoardSizeSlider from "../shared/BoardSizeSlider";

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
  clientParams,
  isLargeScreen,
  handlePlayerName,
  handleDuration,
  handleIncrement,
  handleIsPublic,
  handleNumRows,
  handleNumCols,
  handleShowMoreOptions,
  handleStartPos,
  handleGoalPos,
  handleJoinCode,
  handleCreateGame,
  handleJoinGame,
  handleRefreshName,
  handleToken,
}) => {
  const menuTheme = clientParams.menuTheme;
  const isDarkModeOn = clientParams.isDarkModeOn;
  const showMoreOptions = clientParams.showMoreOptions;
  const BS = clientParams.boardSettings;

  useEffect(() => {
    window.addEventListener("keydown", downHandler);
    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  });
  const downHandler = ({ key }) => {
    if (key !== "Enter") return;
    if (clientParams.joinCode.length > 0) handleJoinGame();
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
            value={clientParams.playerName}
            onChange={(props) => {
              handlePlayerName(props.target.value);
            }}
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
          {clientParams.token === "default" ? (
            defaultToken
          ) : (
            <div className={"white-text"} style={{ fontSize: "30px" }}>
              <i
                className={`material-icons white-text`}
                style={{ height: `100%` }}
              >
                {clientParams.token}
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
            value={`${clientParams.timeControl.duration}`}
            onChange={(props) => {
              handleDuration(props.target.value);
            }}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}>
          m
        </Col>
        <Col s={2} m={2} style={{ paddingRight: "0" }}>
          <TextInput
            id="incrementInput"
            label="Increment"
            value={`${clientParams.timeControl.increment}`}
            onChange={(props) => {
              handleIncrement(props.target.value);
            }}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}>
          s
        </Col>
        <Col s={1} m={2}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={5} m={4}>
          {" "}
          <Checkbox
            id="isPublicCheckbox"
            filledIn
            label="PUBLIC"
            value="PUBLIC"
            checked={clientParams.isPublic}
            onChange={() => {
              handleIsPublic(!clientParams.isPublic);
            }}
          />
        </Col>
        <Col s={2} m={2} style={{ paddingRight: "0" }}>
          <BoardSizeSlider
            label="Rows:"
            min={3}
            max={maxBoardDims[0]}
            value={BS.dims[0]}
            onChange={handleNumRows}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
        <Col s={2} m={2} style={{ paddingRight: "0" }}>
          <BoardSizeSlider
            label="Columns:"
            min={3}
            max={maxBoardDims[1]}
            value={BS.dims[1]}
            onChange={handleNumCols}
          />
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
        <Col s={1} m={2}></Col>
      </Row>
      <Row className="valign-wrapper">
        <Col className="center" s={5} m={4}>
          <span style={{ fontSize: "15px" }}>{"More options:"}</span>
          <Switch
            id="MoreSwitch"
            offLabel="Off"
            onChange={handleShowMoreOptions}
            onLabel="On"
          />
        </Col>
        <Col
          s={2}
          m={2}
          style={{ paddingRight: "0" }}
          title="The row where Player 1 starts"
        >
          {showMoreOptions && (
            <CoordinateSlider
              label="P1 row:"
              min={0}
              max={BS.dims[0] - 1}
              value={BS.startPos[0][0]}
              onChange={(val) => {
                handleStartPos(0, 0, val);
              }}
            />
          )}
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
        <Col
          s={2}
          m={2}
          style={{ paddingRight: "0" }}
          title="The column where Player 1 starts"
        >
          {showMoreOptions && (
            <CoordinateSlider
              label="P1 col:"
              min={0}
              max={BS.dims[1] - 1}
              value={BS.startPos[0][1]}
              onChange={(val) => {
                handleStartPos(0, 1, val);
              }}
            />
          )}
        </Col>
        <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
        <Col s={1} m={2}></Col>
      </Row>
      {showMoreOptions && (
        <Row className="valign-wrapper">
          <Col className="center" s={5} m={4}></Col>
          <Col
            s={2}
            m={2}
            style={{ paddingRight: "0" }}
            title="The row where Player 2 starts"
          >
            <CoordinateSlider
              label="P2 row:"
              min={0}
              max={BS.dims[0] - 1}
              value={BS.startPos[1][0]}
              onChange={(val) => {
                handleStartPos(1, 0, val);
              }}
            />
          </Col>
          <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
          <Col
            s={2}
            m={2}
            style={{ paddingRight: "0" }}
            title="The column where Player 2 starts"
          >
            <CoordinateSlider
              label="P2 col:"
              min={0}
              max={BS.dims[1] - 1}
              value={BS.startPos[1][1]}
              onChange={(val) => {
                handleStartPos(1, 1, val);
              }}
            />
          </Col>
          <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
          <Col s={1} m={2}></Col>
        </Row>
      )}
      {showMoreOptions && (
        <Row className="valign-wrapper">
          <Col className="center" s={5} m={4}></Col>
          <Col
            s={2}
            m={2}
            style={{ paddingRight: "0" }}
            title="The row of the goal of Player 1"
          >
            <CoordinateSlider
              label="G1 row:"
              min={0}
              max={BS.dims[0] - 1}
              value={BS.goalPos[0][0]}
              onChange={(val) => {
                handleGoalPos(0, 0, val);
              }}
            />
          </Col>
          <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
          <Col
            s={2}
            m={2}
            style={{ paddingRight: "0" }}
            title="The column of the goal of Player 1"
          >
            <CoordinateSlider
              label="G1 col:"
              min={0}
              max={BS.dims[1] - 1}
              value={BS.goalPos[0][1]}
              onChange={(val) => {
                handleGoalPos(0, 1, val);
              }}
            />
          </Col>
          <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
          <Col s={1} m={2}></Col>
        </Row>
      )}
      {showMoreOptions && (
        <Row className="valign-wrapper">
          <Col className="center" s={5} m={4}></Col>
          <Col
            s={2}
            m={2}
            style={{ paddingRight: "0" }}
            title="The row of the goal of Player 2"
          >
            <CoordinateSlider
              label="G2 row:"
              min={0}
              max={BS.dims[0] - 1}
              value={BS.goalPos[1][0]}
              onChange={(val) => {
                handleGoalPos(1, 0, val);
              }}
            />
          </Col>
          <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
          <Col
            s={2}
            m={2}
            style={{ paddingRight: "0" }}
            title="The column of the goal of Player 2"
          >
            <CoordinateSlider
              label="G2 Col:"
              min={0}
              max={BS.dims[1] - 1}
              value={BS.goalPos[1][1]}
              onChange={(val) => {
                handleGoalPos(1, 1, val);
              }}
            />
          </Col>
          <Col s={1} m={1} style={{ paddingLeft: "0" }}></Col>
          <Col s={1} m={2}></Col>
        </Row>
      )}
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
            value={`${clientParams.joinCode}`}
            onChange={(props) => {
              console.log(props);
              handleJoinCode(props.target.value);
            }}
          />
        </Col>
        <Col s={1} m={3}></Col>
      </Row>
    </div>
  );
};

export default LobbyForm;
