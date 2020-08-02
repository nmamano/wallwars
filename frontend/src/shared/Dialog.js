import React from "react";
import { Button, Modal } from "react-materialize";

const Dialog = ({
  onClick,
  title,
  body,
  confirmButtonText,
  isOpen,
  onClose,
}) => {
  let actions;
  if (confirmButtonText) {
    actions = [
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
        onClick={onClick}
      >
        {confirmButtonText}
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
      >
        Cancel
      </Button>,
    ];
  } else {
    actions = (
      <Button
        style={{
          backgroundColor: "#009688",
          color: "white",
        }}
        flat
        modal="close"
        node="button"
        waves="green"
      >
        Close
      </Button>
    );
  }

  return (
    <Modal
      style={{ color: "black", backgroundColor: "white" }}
      header={title}
      open={isOpen}
      options={{
        dismissible: true,
        endingTop: "10%",
        inDuration: 250,
        opacity: 0.4,
        outDuration: 250,
        onCloseEnd: onClose,
        preventScrolling: true,
        startingTop: "4%",
      }}
      actions={actions}
    >
      {<div>{body}</div>}
    </Modal>
  );
};

export default Dialog;
