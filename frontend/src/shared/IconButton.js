import React from "react";
import { Button, Icon, Modal } from "react-materialize";

const IconButton = ({
  icon,
  tooltip,
  onClick,
  modalTitle,
  modalBody,
  modalConfirmButtonText,
  bgColor,
  padding,
  disabled,
}) => {
  if (!modalBody) {
    return (
      <Button
        className="teal"
        node="button"
        waves="light"
        icon={<Icon className="large">{icon}</Icon>}
        onClick={onClick}
        tooltip={tooltip}
        disabled={disabled}
      />
    );
  }

  let actions;
  if (modalConfirmButtonText) {
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
        {modalConfirmButtonText}
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
      bottomSheet={false}
      fixedFooter={false}
      header={modalTitle}
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
      trigger={
        <Button
          style={{ padding: `0px ${padding}px` }}
          className={bgColor ? bgColor : "teal"}
          node="button"
          waves="light"
          icon={<Icon className="large">{icon}</Icon>}
          tooltip={tooltip}
          disabled={disabled}
        />
      }
      actions={actions}
    >
      {<div>{modalBody}</div>}
    </Modal>
  );
};

export default IconButton;
