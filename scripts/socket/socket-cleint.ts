// lib/socket.ts
import { Manager, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectToServer = (token: string): Socket => {
  if (!socket) {
    const manager = new Manager("https://fabm.online", {
      path: "/backend_signlink/socket.io",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      extraHeaders: {
        authorization: `Bearer ${token}`,
      },
    });
    socket = manager.socket("/");
  }
  return socket;
};

export const disconnectFromServer = () => {
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
  }
};
