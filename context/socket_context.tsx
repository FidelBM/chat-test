"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Socket } from "socket.io-client";
import {
  connectToServer,
  disconnectFromServer,
} from "@/scripts/socket/socket-cleint";

interface SocketContextType {
  socket: Socket | null;
  status: "connected" | "disconnected";
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  status: "disconnected",
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<"connected" | "disconnected">(
    "disconnected"
  );

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      console.warn("No access token found in localStorage.");
      return;
    }

    const socket = connectToServer(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket conectado:", socket.id);
      setStatus("connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket desconectado");
      setStatus("disconnected");
    });

    return () => {
      disconnectFromServer();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, status }}>
      {children}
    </SocketContext.Provider>
  );
};
