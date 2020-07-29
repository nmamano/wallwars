import React from "react";
import { Button, Icon, Modal } from "react-materialize";

const GameControlPanelButton = ({
  icon,
  tooltip,
  onClick,
  confirmQuestion,
  confirmOption,
  disabled,
}) => {
  if (!confirmQuestion) {
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
  return (
    <Modal
      style={{ color: "black" }}
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
          onClick={onClick}
        >
          {confirmOption}
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
      ]}
      bottomSheet={false}
      fixedFooter={false}
      header="Resign"
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
          className="teal"
          node="button"
          waves="light"
          icon={<Icon className="large">{icon}</Icon>}
          tooltip={tooltip}
          disabled={disabled}
        />
      }
    >
      {<p>{confirmQuestion}</p>}
    </Modal>
  );
};

export default GameControlPanelButton;
