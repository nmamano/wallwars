import { io } from "socket.io-client";
const BACKEND_ENDPOINT = process.env.REACT_APP_BACKEND_URL || "localhost:4001";

const socket = io(BACKEND_ENDPOINT, {
  transports: ["websocket", "polling", "flashsocket"],
  autoConnect: true,
  multiplex: false,
});

// console.log every time the socket event is fired
socket.onAny((eventName: any, ...args: any) => {
  console.log(eventName, args);
});

export default socket;
