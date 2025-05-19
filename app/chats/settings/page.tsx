"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
  selfDescription?: string;
  whyLearn?: string;
  level?: string;
  mediaId?: string;
}

export default function UserSettings() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<Partial<User>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      try {
        const res = await fetch(
          "https://fabm.online/backend_signlink/api/v1/users",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        setUser(data.user);
        setForm({
          username: data.user.username,
          selfDescription: data.user.selfDescription,
          whyLearn: data.user.whyLearn,
          level: data.user.level,
          mediaId: data.user.mediaId,
        });
      } catch (err) {
        console.error("Error al obtener usuario", err);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token || !user) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        "https://fabm.online/backend_signlink/api/v1/users/update",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) {
        throw new Error("Error al actualizar usuario");
      }

      const updated = await res.json();
      setUser(updated);
      setMessage("Información actualizada correctamente ✅");
    } catch (err) {
      console.error("Error al actualizar", err);
      setMessage("❌ Error al actualizar datos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Configuración de Usuario</h1>

      <label className="block mb-2">
        Nombre de usuario:
        <input
          name="username"
          value={form.username || ""}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
      </label>

      <label className="block mb-2">
        ¿Por qué aprendes?:
        <input
          name="whyLearn"
          value={form.whyLearn || ""}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
      </label>

      <label className="block mb-2">
        Descripción personal:
        <textarea
          name="selfDescription"
          value={form.selfDescription || ""}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
      </label>

      <label className="block mb-2">
        Nivel actual:
        <input
          name="level"
          value={form.level || ""}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
      </label>

      <label className="block mb-4">
        Media ID (imagen/avatar):
        <input
          name="mediaId"
          value={form.mediaId || ""}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
        />
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>

      {message && <p className="mt-4 text-sm">{message}</p>}
    </div>
  );
}
