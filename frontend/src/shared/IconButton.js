import React from "react";
import { Button, Icon, Modal } from "react-materialize";

import { getColor } from "./colorThemes";

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
  menuTheme,
  isDarkModeOn,
}) => {
  if (!bgColor) bgColor = getColor(menuTheme, "button", isDarkModeOn);

  if (!modalBody) {
    return (
      <Button
        style={{ backgroundColor: bgColor }}
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
  if (modalConfirmButtonText && modalConfirmButtonText !== "") {
    actions = [
      <Button
        style={{
          backgroundColor: bgColor,
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
          backgroundColor: bgColor,
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
          backgroundColor: bgColor,
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

  const trigger = (
    <Button
      style={{ padding: `0px ${padding}px`, backgroundColor: bgColor }}
      node="button"
      waves="light"
      icon={<Icon className="large">{icon}</Icon>}
      tooltip={tooltip}
      disabled={disabled}
    />
  );

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
      trigger={trigger}
      actions={actions}
    >
      {<div>{modalBody}</div>}
    </Modal>
  );
};

export default IconButton;
