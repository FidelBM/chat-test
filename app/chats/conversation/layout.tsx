"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { BsPeople } from "react-icons/bs";
import { FiSearch, FiSettings } from "react-icons/fi";
import { PiChatsTeardrop, PiUsersThree } from "react-icons/pi";
import { io, Socket } from "socket.io-client";
import {
  connectToServer,
  disconnectFromServer,
} from "@/scripts/socket/socket-cleint";
import Image from "next/image";

const Layout = ({ children }: { children: React.ReactNode }) => {
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
          "https://fabm.online/backend_signlink/api/conversation/user-conversations",
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
                `https://fabm.online/backend_signlink/api/users/friend/id/${otherMember.userId}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              const user = await userRes.json();
              name = user.username;
              avatars = [
                user.mediaId ||
                  "https://signlink.s3.amazonaws.com/1747362218950-b45574f5cdb38e7878db5199595c02c2.jpg",
              ];
            } else {
              avatars = conv.members
                .slice(0, 3)
                .map(
                  (m: any) =>
                    "https://signlink.s3.amazonaws.com/1747362218950-b45574f5cdb38e7878db5199595c02c2.jpg"
                ); // Placeholder
            }

            return {
              id: conv._id,
              name,
              isGroup: conv.isGroup,
              avatars,
              preview: conv.lastMessageId?.content || "No messages yet",
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

    const socket = io("https://fabm.online", {
      path: "/backend_signlink/socket.io",
      auth: { token },
      transports: ["websocket"],
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

  console.log("Conversations:", conversations);

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      {/* Sidebar fijo con scroll propio */}
      <aside className="w-1/4 border-r border-gray-200 bg-white p-4 overflow-y-auto">
        <div className="mb-5 text-xl font-semibold">Chats</div>
        <ul className="space-y-2">
          {conversations.map((chat, idx) => (
            <Link
              href={`/chats/conversation/${chat.id}`}
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all hover:bg-gray-100 ${
                activeChat === chat.id
                  ? "bg-gradient-to-r from-purple-100 to-blue-100"
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
              <span className="text-xs text-gray-600">{chat.time}</span>
            </Link>
          ))}
        </ul>
      </aside>

      {/* Contenido del chat: ocupar espacio restante y controlar scroll internamente */}
      <div className="flex-1 h-full overflow-hidden">{children}</div>
    </div>
  );
};

export default Layout;
