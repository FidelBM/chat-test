"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const ChatPage = () => {
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const fetchConversations = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}conversation/user-conversations`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();

        const formatted = await Promise.all(
          data.map(async (conv: any) => {
            let name = conv.name;
            let avatars = [];

            if (!conv.isGroup) {
              const otherMember = conv.members.find(
                (m: any) => m.userId !== getUserIdFromToken(token)
              );
              const userRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}users/friend/id/${otherMember.userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const user = await userRes.json();
              name = user.username;
              avatars = [user.mediaId || "/avatars/default.jpg"];
            } else {
              avatars = conv.members
                .slice(0, 3)
                .map((m: any) => "/avatars/default.jpg"); // Placeholder
            }

            return {
              id: conv._id,
              name,
              isGroup: conv.isGroup,
              avatars,
              preview: "(no message)",
              time: new Date(conv.updatedAt).toLocaleTimeString(),
            };
          })
        );

        setConversations(formatted);
        setActiveChat(formatted[0]?.id);
      } catch (err) {
        console.error("Error loading conversations:", err);
      }
    };

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL_SOCKET}`, {
      path: "/backend_signlink/socket.io",
      auth: { token },
      transports: ["websocket"], // para evitar errores de polling
    });

    socketRef.current = socket;

    socket.on("message-from-server", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    fetchConversations();

    return () => {
      socket.disconnect();
    };
  }, []);

  const getUserIdFromToken = (token: string): string => {
    try {
      return JSON.parse(atob(token.split(".")[1])).id;
    } catch {
      return "";
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      const msg = { sender: "You", text: message };
      setMessages((prev) => [...prev, msg]);
      socketRef.current?.emit("message-from-client", msg);
      setMessage("");
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <aside className="w-1/4 border-r border-gray-200 bg-white p-4 overflow-y-auto">
        <div className="mb-6 text-xl font-semibold">Chats</div>
        <ul className="space-y-2">
          {conversations.map((chat, idx) => (
            <li
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all hover:bg-gray-100 ${
                activeChat === chat.id
                  ? "bg-gradient-to-r from-purple-300 to-blue-300"
                  : ""
              }`}
            >
              <div>
                <div className="flex gap-1 mb-1">
                  {chat.avatars.map((avatar: string, index: number) => (
                    <Image
                      key={index}
                      src={avatar}
                      width={28}
                      height={28}
                      alt="avatar"
                      className="rounded-full border"
                    />
                  ))}
                </div>
                <div className="text-sm font-medium">{chat.name}</div>
                <div className="text-xs text-gray-600">{chat.preview}</div>
              </div>
              <span className="text-xs text-gray-400">{chat.time}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
          <div>
            <div className="font-semibold">
              {conversations.find((c) => c.id === activeChat)?.name ||
                "Select chat"}
            </div>
            <div className="text-sm text-gray-500">(status info here)</div>
          </div>
          <div className="flex gap-3 text-lg">
            <button>🔊</button>
            <button>📞</button>
            <button>⋮</button>
          </div>
        </header>

        {/* Messages */}
        <section className="flex-1 px-6 py-4 space-y-3 overflow-y-auto bg-gray-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                msg.sender === "You"
                  ? "ml-auto bg-blue-500 text-white rounded-br-none"
                  : "bg-white text-gray-900 rounded-bl-none"
              }`}
            >
              <div className="font-medium mb-1">{msg.sender}</div>
              <div>{msg.text}</div>
            </div>
          ))}
        </section>

        {/* Input */}
        <footer className="border-t border-gray-200 p-4 bg-white flex items-center gap-2">
          <button className="text-xl">😊</button>
          <label className="cursor-pointer">
            📎
            <input
              type="file"
              className="hidden"
              onChange={(e) =>
                alert(`File selected: ${e.target.files?.[0]?.name}`)
              }
            />
          </label>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
          >
            Send
          </button>
        </footer>
      </main>
    </div>
  );
};

export default ChatPage;
