"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 4) {
      setError("Ingresa los 4 dígitos");
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}users/verify/${fullCode}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Código incorrecto");
        return;
      }

      const data = await res.json();

      // Guardar tokens
      localStorage.setItem("accessToken", data.jwtoken);
      document.cookie = `refreshToken=${data.refreshToken}; Path=/; Max-Age=${
        60 * 60 * 24 * 90
      }; Secure; SameSite=Strict`;

      router.push("/chats");
    } catch (err) {
      setError("No se pudo verificar el código");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4">
      <div className="max-w-sm w-full text-center">
        <div className="flex justify-center mb-6"></div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Verification Code
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Enter the 4-digit code we’ve sent to ******1958
        </p>

        {error && <div className="text-red-500 font-medium mb-3">{error}</div>}

        <div className="flex justify-between gap-2 mb-4">
          {code.map((val, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputsRef.current[idx] = el;
              }}
              type="text"
              maxLength={1}
              value={val}
              onChange={(e) => handleChange(idx, e.target.value)}
              className="w-12 h-14 text-2xl text-center border-2 border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Didn’t get the code?{" "}
          <button className="text-blue-600 font-medium hover:underline">
            Click to resend
          </button>
        </p>

        <div className="flex justify-between gap-4">
          <button
            onClick={() => router.push("/register")}
            className="w-full py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}
