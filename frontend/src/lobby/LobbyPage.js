import React from "react";
import { Row, Col, TextInput, Button } from "react-materialize";

import Header from "../shared/Header";

const LobbyPage = () => {
  const showHelp = () => {
    console.log("todo: show lobby help in modal window");
  };

  const randomUsername = () => Math.random().toString(36).substring(2, 10);

  return (
    <div>
      <Header gameName={""} showHelp={showHelp} />
      <div className="container teal darken-2" style={{ marginTop: "2rem" }}>
        <Row className="valign-wrapper">
          <Col className="center" s={3}>
            <h5>Your name:</h5>
          </Col>
          <Col s={3}>
            <TextInput id="nameInput" defaultValue={randomUsername()} />
          </Col>
          <Col s={6}></Col>
        </Row>
        <Row className="valign-wrapper">
          <Col className="center" s={3}>
            <Button node="button" waves="light">
              Create game
            </Button>
          </Col>
          <Col s={1} style={{ paddingRight: "0" }}>
            <TextInput id="durationInput" label="Duration" defaultValue="5" />
          </Col>
          <Col s={1} style={{ paddingLeft: "0" }}>
            m
          </Col>
          <Col s={1} style={{ paddingRight: "0" }}>
            <TextInput id="incrementInput" label="Increment" defaultValue="2" />
          </Col>
          <Col s={1} style={{ paddingLeft: "0" }}>
            s
          </Col>
          <Col s={5}></Col>
        </Row>
        <Row className="valign-wrapper">
          <Col className="center" s={3}>
            <Button node="button" waves="light">
              Join game
            </Button>
          </Col>
          <Col s={5}>
            <TextInput id="joinInput" placeholder="Write game code here..." />
          </Col>
          <Col s={4}></Col>
        </Row>
      </div>
    </div>
  );
};

export default LobbyPage;
