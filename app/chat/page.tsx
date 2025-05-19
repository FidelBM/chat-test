"use client";
import {
  connectToServer,
  disconnectFromServer,
} from "@/scripts/socket/socket-cleint";
import { useRef, useEffect, useState } from "react";
import { Socket } from "socket.io-client";

export default function ChatPage() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState("disconnected");
  const [clientes, setClientes] = useState([]);
  const [jwt, setJwt] = useState("");
  const [messages, setMessages] = useState<{ id: string; message: string }[]>(
    []
  );

  const handleConnect = () => {
    if (!socketRef.current && jwt) {
      const socket = connectToServer(jwt);
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Socket conectado:", socket.id);
        setStatus("connected");
      });

      socket.on("disconnect", () => {
        console.log("Socket desconectado:", socket.id);
        setStatus("disconnected");
      });

      socket.on("clientes-updated", (clientes) => {
        console.log("Clientes atualizados:", clientes);
        setClientes(clientes);
      });

      socket.on("message-from-server", (message) => {
        console.log("Mensagem recebida do servidor:", message);
        setMessages((prevMessages) => [...prevMessages, message]);
      });
    }
  };

  useEffect(() => {
    return () => {
      disconnectFromServer();
    };
  }, []);

  return (
    <div>
      <h1>Chat</h1>
      <p>Status: {status}</p>
      <ul>
        {clientes.map((cliente, index) => (
          <li key={index}>{cliente}</li>
        ))}
      </ul>
      <input
        type="text"
        placeholder="JWT"
        required
        onChange={(e) => setJwt(e.target.value)}
      />
      <button onClick={handleConnect}>Connect</button>
      <br />
      <ul>
        {messages.map((message, index) => (
          <li key={index}>
            {message.id}: {message.message}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector(
            "input"
          ) as HTMLInputElement;
          const message = input.value;
          if (socketRef.current) {
            console.log("Enviando message:", message);
            socketRef.current.emit("message-from-client", {
              id: socketRef.current.id,
              message,
            });
            input.value = "";
          }
        }}
      >
        <input type="text" placeholder="Write your message" required />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}
