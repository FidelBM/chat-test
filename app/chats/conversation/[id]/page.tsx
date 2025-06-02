"use client";

import { useSocket } from "@/context/socket_context";
import { ChatGroup } from "@/interfaces/conversations";
import { use, useEffect, useRef, useState } from "react";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

interface Attachment {
  id: string;
  url: string;
  type: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
  seenBy: string[];
  seenByUsernames?: string[];
  attachment?: Attachment;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ChatGroup[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { id } = use(params);
  const { socket } = useSocket();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  // Agrupa mensajes por día
  const groupByDay = (msgs: Message[]) =>
    msgs.reduce<Record<string, Message[]>>((acc, msg) => {
      const day = new Date(msg.createdAt).toLocaleDateString();
      (acc[day] ||= []).push(msg);
      return acc;
    }, {});

  // Subir archivo al servidor
  const uploadFile = async (file: File): Promise<Attachment> => {
    const token = localStorage.getItem("accessToken");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    console.log(file);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`! },
      body: formData,
    });

    // Verificar si la respuesta es exitosa
    if (!res.ok) throw new Error("Error al subir archivo");
    const data = await res.json();

    console.log("Archivo subido:", data);
    return { id: data._id, url: data.url, type: file.type };
  };

  // Cerrar picker si clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Scroll automático
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (nearBottom)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch inicial de conversación, usuarios y primeros mensajes
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const fetchInitial = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}conversation/conversation/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const convo = await res.json();
        setConversations([convo]);

        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const me = await meRes.json();
        setCurrentUserId(me.user.id);
        setCurrentUserName(me.user.username);

        const map: Record<string, string> = {};
        for (const member of convo.members) {
          const userRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}users/friend/id/${member.userId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const user = await userRes.json();
          map[member.userId] = user.username;
        }
        setUserMap(map);

        await loadMoreMessages(0, token, true);
      } catch (err) {
        console.error(err);
        setLoadError(true);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchInitial();
  }, [id]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    console.log("mensages", messages);

    const unseenMessages = messages.filter(
      (msg) =>
        !msg.seenBy?.includes(currentUserId!) && msg.sender !== currentUserId
    );

    console.log("Mensajes no vistos:", unseenMessages);

    for (const msg of unseenMessages) {
      console.log("Conversación:", msg);
      socket.emit("message-seen", {
        messageId: msg.id,
        conversationId: id,
      });
    }
  }, [messages, socket, currentUserId]);

  // Carga paginada de mensajes
  const loadMoreMessages = async (
    customSkip = skip,
    tokenOverride?: string,
    isInitial = false
  ) => {
    const token = tokenOverride || localStorage.getItem("accessToken");
    if (!token || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}conversation/get-messages/${id}?limit=10&skip=${customSkip}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      console.log("Cargando mensajes:", data);
      if (!data.length) {
        setHasMore(false);
      } else {
        const formatted: Message[] = data.map((m: any) => ({
          id: m._id,
          sender: m.senderId,
          text: m.content,
          createdAt: m.createdAt,
          seenBy: m.seenBy || [],
          seenByUsernames: m.seenByUsernames || [],
          attachment: m.attachmentId
            ? {
                id: m.attachmentId,
                url: m.attachment.url,
                type: m.attachment.type,
              }
            : undefined,
        }));
        const ordered = formatted.reverse();
        setMessages((prev) => (isInitial ? ordered : [...ordered, ...prev]));
        setSkip((prev) => prev + data.length);
      }
    } catch (err) {
      console.error(err);
      setLoadError(true);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Scroll para paginar al subir
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop < 50 && hasMore && !isLoadingMore) loadMoreMessages();
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [skip, hasMore, isLoadingMore]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join-room", id);

    const handleIncoming = (msg: any) => {
      const newMsg: Message = {
        id: msg.id,
        sender: msg.sender,
        text: msg.text || msg.message,
        createdAt: msg.createdAt,
        seenBy: msg.seenBy || [],
        attachment: msg.attachment || undefined,
        seenByUsernames: msg.seenByUsernames || [],
      };

      console.log("Nuevo mensaje recibido:", newMsg);

      setMessages((prev) => {
        if (
          currentUserId &&
          msg.sender !== currentUserId &&
          !msg.seenBy.includes(currentUserId)
        ) {
          socket.emit("message-seen", {
            messageId: msg.id,
            conversationId: id,
          });
        }

        return [...prev, newMsg];
      });
    };

    const handleSeen = (payload: {
      messageId: string;
      userId: string;
      username?: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId
            ? {
                ...m,
                seenBy: Array.from(new Set([...m.seenBy, payload.userId])),
                seenByUsernames: Array.from(
                  new Set([
                    ...(m.seenByUsernames || []),
                    payload.username || payload.userId,
                  ])
                ),
              }
            : m
        )
      );
    };

    socket.on("message-from-server", handleIncoming);
    socket.on("message-seen", handleSeen);
    return () => {
      socket.off("message-from-server", handleIncoming);
      socket.off("message-seen", handleSeen);
    };
  }, [socket, id]);

  // Manejar selección de archivo y preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  const handleSend = async () => {
    if (!socket || !currentUserId) return;
    if (!message.trim() && !attachment) return;

    console.log("Enviando mensaje:", message, attachment);

    let uploadedAttachment: Attachment | null = null;

    // ✅ Subir solo si hay archivo seleccionado
    if (selectedFile) {
      try {
        console.log("Subiendo archivo:", selectedFile.name);
        uploadedAttachment = await uploadFile(selectedFile);
      } catch {
        alert("Error al subir archivo");
        return;
      }
    }

    console.log(uploadedAttachment);

    socket.emit("message-from-client-private", {
      message,
      conversationId: id,
      type: uploadedAttachment ? "file" : "text",
      attachmentId: uploadedAttachment?.id,
    });

    setMessage("");
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setAttachment(null);
    setShowEmojiPicker(false);
  };

  const toggleEmojiPicker = () => setShowEmojiPicker((prev) => !prev);
  const addEmoji = (e: any) => setMessage((prev) => prev + e.native);

  const grouped = groupByDay(messages);

  return (
    <main className="flex flex-col h-full relative">
      <header className="flex justify-between items-center p-4 border-b bg-white">
        <p className="text-lg font-semibold">
          {conversations[0]?.name || "Conversación"}
        </p>
        <div className="flex gap-3 text-xl">
          <button>🔊</button>
          <button>📞</button>
          <button>⋮</button>
        </div>
      </header>

      <section
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50"
      >
        {isInitialLoading && (
          <div className="text-center text-gray-500">Cargando mensajes...</div>
        )}
        {loadError && (
          <div className="text-center text-red-500">
            Error al cargar.{" "}
            <button onClick={() => loadMoreMessages(0)}>Reintentar</button>
          </div>
        )}
        {isLoadingMore && !isInitialLoading && (
          <div className="text-center text-gray-400">Cargando más...</div>
        )}

        {Object.entries(grouped).map(([day, msgs]) => (
          <div key={day}>
            <div className="text-center text-sm text-gray-500 my-2">{day}</div>
            {msgs.map((msg, idx) => {
              const time = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const isMine = msg.sender === currentUserId;
              const seenNames =
                msg.seenByUsernames?.filter(
                  (name: string) => name !== currentUserName
                ) || [];

              return (
                <div
                  key={`${msg.id}-${idx}`}
                  className={`max-w-xs px-4 py-2 rounded-3xl text-sm ${
                    isMine
                      ? "ml-auto bg-indigo-500 text-white rounded-br-none"
                      : "bg-white text-gray-900 rounded-bl-none"
                  } mb-2`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">
                      {isMine ? "Tú" : userMap[msg.sender] || msg.sender}
                    </span>
                    <span className="text-xs text-gray-300">{time}</span>
                  </div>
                  <div className="space-y-2">
                    {msg.text && <p>{msg.text}</p>}
                    {msg.attachment?.type &&
                      msg.attachment.type.startsWith("image") && (
                        <img
                          src={msg.attachment.url}
                          alt="attachment"
                          className="rounded-md max-w-full"
                        />
                      )}

                    {msg.attachment?.type &&
                      !msg.attachment.type.startsWith("image") && (
                        <a
                          href={msg.attachment.url}
                          download
                          className="text-white underline"
                        >
                          Descargar archivo
                        </a>
                      )}
                  </div>
                  {seenNames.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      Seen by: {seenNames.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </section>

      <footer className="border-t p-4 bg-white flex flex-col relative">
        <div className="flex items-center gap-2">
          <button onClick={toggleEmojiPicker} className="text-2xl">
            😊
          </button>
          <label className="cursor-pointer">
            📎
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600"
          >
            Enviar
          </button>
        </div>

        {filePreviewUrl && (
          <div className="mt-2 relative w-32">
            {selectedFile?.type.startsWith("image") ? (
              <img
                src={filePreviewUrl}
                alt="Preview"
                className="rounded-md border"
              />
            ) : (
              <div className="p-2 border rounded-md bg-gray-100">
                {selectedFile?.name}
              </div>
            )}
            <button
              onClick={() => {
                setSelectedFile(null);
                setFilePreviewUrl(null);
                setAttachment(null);
              }}
              className="absolute top-0 right-0 bg-white text-black rounded-full px-1"
            >
              ✕
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-20 left-4 z-50">
            <Picker data={emojiData} onEmojiSelect={addEmoji} />
          </div>
        )}
      </footer>
    </main>
  );
}
