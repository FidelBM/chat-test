"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Friend } from "@/interfaces/friend";
import StatusBadge from "./StatusBadge";

interface FriendRequest {
  id: string;
  status: string;
  createdAt: string;
  from: {
    id: string;
    username: string;
    email: string;
    mediaId: string | null;
  };
}

const ContractTable = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Friend | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowModal(false);
        setSearchResult(null);
        setSearchQuery("");
      }
    }

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModal]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([fetchFriends(), fetchFriendRequests()]);
  };

  const fetchFriends = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return setError("No se encontró el token.");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}users/friends`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Error al obtener amigos");
      const data = await response.json();
      console.log("Amigos:", data);
      setFriends(data);
    } catch (err) {
      setError("Error al obtener amigos.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}users/friend-request`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setFriendRequests(data);
      }
    } catch (err) {
      console.error("Error al obtener solicitudes", err);
    }
  };

  const handleSearch = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !searchQuery) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}users/friend/${searchQuery}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) return setSearchResult(null);

      const data = await response.json();
      console.log("Resultado de búsqueda:", data);
      setSearchResult(data[0] ?? null);
    } catch (error) {
      console.error("Error al buscar usuario:", error);
    }
  };

  const handleSendRequest = async (friendId: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}users/friend-request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ friendId }),
        }
      );

      if (res.ok) {
        alert("Solicitud enviada");
        setSearchResult(null);
        setSearchQuery("");
        setShowModal(false);
      } else {
        alert("Error al enviar solicitud");
      }
    } catch (err) {
      console.error("Error al enviar solicitud", err);
    }
  };

  const handleRespondRequest = async (
    requestId: string,
    accept: boolean,
    senderId: string
  ) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const endpoint = accept
      ? `accept-friend-request/${requestId}`
      : `reject-friend-request/${requestId}`;

    try {
      // Aceptar o rechazar solicitud
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}users/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Si fue aceptada, crear conversación
      if (accept) {
        // 1. Obtener usuario actual
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}users`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userRes.ok)
          throw new Error("No se pudo obtener el usuario actual");

        const currentUser = await userRes.json();

        const group = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}conversation/create-conversation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              isGroup: false,
              members: [{ userId: currentUser.user.id }, { userId: senderId }],
            }),
          }
        );

        if (!group.ok) throw new Error("Error al crear conversación");
        const groupData = await group.json();
      }

      await fetchAllData();
    } catch (err) {
      console.error("Error al responder solicitud", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  console.log(searchResult?.username);

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold">Contracts</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Add Friend
        </button>
      </div>

      {/* Solicitudes pendientes */}
      {friendRequests.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="font-semibold text-gray-700">
            Solicitudes de amistad
          </h2>
          {friendRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between bg-gray-100 px-4 py-3 rounded shadow"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={
                    req.from?.mediaId && req.from.mediaId.trim() !== ""
                      ? req.from.mediaId
                      : "https://signlink.s3.amazonaws.com/1747362218950-b45574f5cdb38e7878db5199595c02c2.jpg"
                  }
                  alt={req.from?.username || "Unknown"}
                  width={50}
                  height={50}
                  className="rounded-full"
                />
                <div>
                  <div className="font-semibold">
                    {req.from?.username || "Unknown"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {req.from?.email || "No email provided"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleRespondRequest(req.id, true, req.from.id)
                  }
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Aceptar
                </button>
                <button
                  onClick={() =>
                    handleRespondRequest(req.id, false, req.from.id)
                  }
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-300/30 backdrop-invert backdrop-opacity-10 flex items-center justify-center z-50">
          <div
            ref={modalRef}
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl relative"
          >
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => {
                setShowModal(false);
                setSearchResult(null);
                setSearchQuery("");
              }}
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">Buscar amigo</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Buscar por nombre"
                className="px-4 py-2 border border-gray-300 rounded w-full"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Buscar
              </button>
            </div>

            {searchResult && (
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded shadow">
                <div className="flex items-center gap-3">
                  <Image
                    src={
                      searchResult?.mediaId &&
                      searchResult.mediaId.trim() !== ""
                        ? searchResult.mediaId
                        : "https://signlink.s3.amazonaws.com/1747362218950-b45574f5cdb38e7878db5199595c02c2.jpg"
                    }
                    alt={searchResult.username}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <div className="font-semibold">{searchResult.username}</div>
                    <div className="text-sm text-gray-500">
                      {searchResult.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(searchResult.id)}
                  className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                >
                  Enviar solicitud
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg overflow-hidden mt-6">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50 text-left text-sm text-gray-500">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Number</th>
              <th className="p-4 flex items-center gap-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {friends.map((friend) => (
              <tr key={friend.id} className="hover:bg-gray-50 text-sm">
                <td className="p-4 flex items-center space-x-2">
                  <Image
                    src={
                      friend?.mediaId && friend.mediaId.trim() !== ""
                        ? friend.mediaId
                        : "https://signlink.s3.amazonaws.com/1747362218950-b45574f5cdb38e7878db5199595c02c2.jpg"
                    }
                    alt={friend?.username || "Unknown"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <div className="font-medium">{friend.username}</div>
                  </div>
                </td>
                <td className="p-4">{friend.email}</td>
                <td className="p-4">{friend.role}</td>
                <td className="p-4">
                  <StatusBadge status={friend.role} />
                </td>
                <td className="p-4">{friend.number}</td>
                <td className="p-4">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContractTable;
