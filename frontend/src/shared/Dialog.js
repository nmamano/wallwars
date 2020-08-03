import React from "react";
import { Button, Modal } from "react-materialize";

const Dialog = ({
  title,
  body,
  acceptButtonText, //defaults to Accept
  rejectButtonText, //defaults to Cancel
  isOpen,
  callback, //callback function will receive true or false
}) => {
  return (
    <Modal
      style={{ color: "black", backgroundColor: "white" }}
      header={title}
      open={isOpen}
      options={{
        dismissible: false,
        endingTop: "10%",
        inDuration: 250,
        opacity: 0.4,
        outDuration: 250,
        preventScrolling: true,
        startingTop: "4%",
      }}
      actions={[
        <Button
          style={{
            backgroundColor: "#009688",
            color: "white",
            marginRight: "1rem",
          }}
          flat
          modal="close"
          node="button"
          waves="green"
          onClick={() => {
            callback(true);
          }}
        >
          {acceptButtonText || "Accept"}
        </Button>,
        <Button
          style={{
            backgroundColor: "#009688",
            color: "white",
          }}
          flat
          modal="close"
          node="button"
          waves="green"
          onClick={() => {
            callback(false);
          }}
        >
          {rejectButtonText || "Cancel"}
        </Button>,
      ]}
    >
      {<div>{body}</div>}
    </Modal>
  );
};

export default Dialog;
