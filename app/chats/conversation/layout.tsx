"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import { useSocket } from "@/context/socket_context";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friends, setFriends] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const { socket } = useSocket();

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
                );
            }

            return {
              id: conv._id,
              name,
              isGroup: conv.isGroup,
              avatars,
              preview: conv.lastMessageId?.content || "No messages yet",
              time: new Date(conv.updatedAt).toLocaleTimeString(),
              unreadCount: conv.unreadCount || 0,
            };
          })
        );

        setConversations(formatted);
      } catch (err) {
        console.error("Error loading conversations:", err);
      }
    };

    const fetchFriends = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}users/friends`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        setFriends(data);
      } catch (err) {
        console.error("Error fetching friends:", err);
      }
    };

    fetchConversations();
    fetchFriends();
  }, []);

  const getUserIdFromToken = (token: string): string => {
    try {
      return JSON.parse(atob(token.split(".")[1])).id;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (!socket) return;

    const token = localStorage.getItem("accessToken");
    const currentUserId = getUserIdFromToken(token || "");

    const handleIncoming = (msg: any) => {
      setMessages((prev) => [...prev, msg]);

      console.log("New message received:", msg);

      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === msg.conversationId) {
            const isUserNotSender = msg.sender !== currentUserId;
            console.log(
              "Updating conversation:",
              activeChat,
              "with message:",
              msg
            );
            console.log("validar", conv.id, activeChat);
            return {
              ...conv,
              preview: msg.message || "Archivo",
              time: new Date().toLocaleTimeString(),
              unreadCount:
                msg.conversationId === activeChat || !isUserNotSender
                  ? 0
                  : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });

        const sorted = updated.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );

        console.log(activeChat, "active chat id");

        console.log("Updated conversations:", sorted);

        return sorted;
      });
    };

    socket.on("message-from-server", handleIncoming);

    return () => {
      socket.off("message-from-server", handleIncoming);
    };
  }, [socket, activeChat]);

  const handleGroupCreation = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !groupName || selectedFriends.length === 0) return;

    const formData = new FormData();
    formData.append("name", groupName);
    formData.append("description", groupDesc);
    if (groupImage) formData.append("file", groupImage);

    const members = selectedFriends.map((id) => ({ userId: id }));
    members.push({ userId: getUserIdFromToken(token) });

    formData.append("members", JSON.stringify(members));

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}conversation/create-group`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (res.ok) {
        setShowForm(false);
        setGroupName("");
        setGroupDesc("");
        setGroupImage(null);
        setSelectedFriends([]);
        const updated = await res.json();
        setConversations((prev) => [...prev, updated]);
      }
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  useEffect(() => {
    console.log("Active chat changed:", activeChat);

    setConversations((prev) =>
      prev.map((conv) => {
        console.log("Checking conversation:", conv);
        if (conv.id === activeChat) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      })
    );
  }, [activeChat]);

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      <aside className="w-1/4 border-r border-gray-200 bg-white p-4 overflow-y-auto">
        <div className="mb-5 flex justify-between items-center">
          <span className="text-xl font-semibold">Chats</span>
          <button
            className="text-blue-500 text-sm underline"
            onClick={() => setShowForm(!showForm)}
          >
            + Grupo
          </button>
        </div>

        {showForm && (
          <div className="mb-4 p-3 border rounded space-y-2">
            <input
              type="text"
              className="w-full border p-1 rounded"
              placeholder="Nombre del grupo"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <input
              type="text"
              className="w-full border p-1 rounded"
              placeholder="Descripción (opcional)"
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
            />
            <input
              type="file"
              className="w-full border p-1 rounded"
              onChange={(e) => setGroupImage(e.target.files?.[0] || null)}
            />
            <div className="text-sm font-semibold mt-2">Amigos</div>
            <div className="max-h-32 overflow-y-auto">
              {friends.map((friend) => (
                <label key={friend.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={friend.id}
                    checked={selectedFriends.includes(friend.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedFriends((prev) =>
                        checked
                          ? [...prev, friend.id]
                          : prev.filter((id) => id !== friend.id)
                      );
                    }}
                  />
                  <span>{friend.username}</span>
                </label>
              ))}
            </div>
            <button
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
              onClick={handleGroupCreation}
            >
              Crear grupo
            </button>
          </div>
        )}

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
              {chat.unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {chat.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </ul>
      </aside>

      <div className="flex-1 h-full overflow-hidden">{children}</div>
    </div>
  );
};

export default Layout;
