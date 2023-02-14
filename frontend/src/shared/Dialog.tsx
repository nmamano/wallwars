import { Button, Modal } from "react-materialize";
import { getColor, MenuThemeName } from "./colorThemes";

export default function Dialog({
  title,
  body,
  acceptButtonText,
  rejectButtonText,
  isOpen,
  callback,
  menuTheme,
  isDarkModeOn,
}: {
  title: string;
  body: string;
  acceptButtonText?: string; // Defaults to Accept.
  rejectButtonText?: string; // Defaults to Cancel.
  isOpen: boolean;
  callback: (accepted: boolean) => void;
  menuTheme: MenuThemeName;
  isDarkModeOn: boolean;
}): JSX.Element {
  const buttonCol = getColor(menuTheme, "button", isDarkModeOn);
  return (
    <Modal
      // @ts-ignore
      style={{ color: "black", backgroundColor: "#e0e0e0" }}
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
            backgroundColor: buttonCol,
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
            backgroundColor: buttonCol,
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
}
