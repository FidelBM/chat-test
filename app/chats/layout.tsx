"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { BsPeople } from "react-icons/bs";
import { FiSearch, FiSettings } from "react-icons/fi";
import { PiChatsTeardrop, PiUsersThree } from "react-icons/pi";
import { Socket } from "socket.io-client";
import {
  connectToServer,
  disconnectFromServer,
} from "@/scripts/socket/socket-cleint";
import Image from "next/image";
import { useSocket } from "@/context/socket_context";

interface Friend {
  id: string;
  username: string;
  email: string;
  mediaId: string | null;
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const { socket, status } = useSocket();

  const pathname = usePathname();
  const socketRef = useRef<Socket | null>(null);

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const refreshAccessToken = async (): Promise<string | null> => {
      const cookies = document.cookie.split("; ").reduce((acc: any, curr) => {
        const [key, value] = curr.split("=");
        acc[key] = value;
        return acc;
      }, {});

      const refreshToken = cookies["refreshToken"];

      if (refreshToken) {
        try {
          const res = await fetch(
            "https://fabm.online/backend_signlink/api/users/refresh",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const token = data.accessToken;
            localStorage.setItem("accessToken", token);
            return token;
          } else {
            console.warn("No se pudo renovar el token");
          }
        } catch (err) {
          console.error("Error al renovar el token:", err);
        }
      }

      return null;
    };

    const fetchFriends = async (token: string) => {
      try {
        const response = await fetch(
          "https://fabm.online/backend_signlink/api/users/friends",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const err = await response.json();
          setError(err.message || "Error al obtener los amigos");
          return;
        }

        const data = await response.json();
        setFriends(data);
      } catch (err) {
        setError("No se pudo conectar con el servidor.");
      }
    };

    const init = async () => {
      const tokenFromRefresh = await refreshAccessToken();
      const token = tokenFromRefresh || localStorage.getItem("accessToken");

      if (!token) {
        setError("No se encontró el token. Inicia sesión primero.");
        return;
      }

      await fetchFriends(token);
    };

    init();

    if (!socket) return;

    const handleClientesUpdate = (userIds: string[]) => {
      console.log("Amigos conectados (clientes-updated):", userIds);
      setConnectedUserIds(userIds);
    };

    // Escuchar actualizaciones del backend
    socket.on("clientes-updated", handleClientesUpdate);

    // Solicita estado inicial de amigos conectados (opcional pero útil)
    socket.emit("get-connected-friends");

    // Limpieza al desmontar
    return () => {
      socket.off("clientes-updated", handleClientesUpdate);
    };
  }, [socket]);

  return (
    <div className="flex flex-row min-w-screen min-h-screen bg-gray-100">
      <div className="md:w-1/5 w-1/6 h-screen bg-white border-r-2 border-gray-300 p-4 flex flex-col space-y-6 text-sm text-gray-800">
        {/* Header */}
        <div className="flex items-center space-x-2">
          <div className="bg-purple-600 p-2 rounded-lg"></div>
          <span className="text-lg font-semibold">SignLink</span>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-10 pr-3 py-2 bg-gray-100 rounded-md focus:outline-none"
          />
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
        </div>

        {/* Main */}
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Main</p>
          <ul className="space-y-1">
            <Link href="/chats/contacts">
              <li
                className={`flex items-center space-x-2 p-2 rounded-md ${
                  isActive("/chats/contacts")
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <PiUsersThree />
                <span>Contacts</span>
              </li>
            </Link>
            <Link href="/chats/conversation">
              <li
                className={`flex items-center space-x-2 p-2 rounded-md ${
                  pathname.startsWith("/chats/conversation")
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <PiChatsTeardrop />
                <span>Chats</span>
              </li>
            </Link>
            <li className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md">
              <FiSettings />
              <span>Setting</span>
            </li>
          </ul>
        </div>

        {/* Groups */}
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">Groups</p>
          <ul className="space-y-3">
            <li className="flex items-center space-x-3">
              <div className="bg-gradient-to-tr from-purple-500 to-blue-500 p-2 rounded-full">
                <BsPeople className="text-white" />
              </div>
              <div>
                <p className="font-medium">Clients</p>
                <p className="text-xs text-gray-500">(209) 555-0104</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Friends */}
        <div className="flex-grow">
          <p className="text-xs font-medium text-gray-400 mb-2">Friends</p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <ul className="space-y-2">
            {[...friends]
              .sort((a, b) => {
                const aOnline = connectedUserIds.includes(a.id);
                const bOnline = connectedUserIds.includes(b.id);
                return Number(bOnline) - Number(aOnline); // conectados primero
              })
              .map((friend) => (
                <li key={friend.id} className="flex items-center space-x-2">
                  <div className="relative w-6 h-6">
                    <div className="w-6 h-6 bg-gray-300 rounded-full overflow-hidden">
                      <Image
                        src={
                          friend.mediaId ||
                          "https://signlink.s3.amazonaws.com/1747362218950-b45574f5cdb38e7878db5199595c02c2.jpg"
                        }
                        alt={friend.username}
                        width={24}
                        height={24}
                        className="object-cover w-full h-full rounded-full"
                      />
                    </div>

                    {connectedUserIds.includes(friend.id) && (
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"
                        title="Online"
                      />
                    )}
                  </div>

                  <span>{friend.username}</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
      {children}
    </div>
  );
};

export default Layout;
