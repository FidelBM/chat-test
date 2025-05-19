"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const response = await fetch(
        "https://fabm.online/backend_signlink/api/users/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      console.log("Response:", response);

      if (response.ok) {
        const data = await response.json();

        console.log("Data:", data);
        localStorage.setItem("accessToken", data.token);
        document.cookie = `refreshToken=${data.refreshToken}; Path=/; Max-Age=7776000; Secure; SameSite=Strict`;
        router.push("/chats");
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Credenciales inválidas");
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center flex-col justify-center px-6 py-12 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
      <div className="flex flex-col lg:w-[40%] xl:w-1/3 w-full text-center shadow-lg rounded-xl bg-white p-10">
        <h1 className="text-2xl font-bold text-neutral-900 m-2">
          Welcome Back
        </h1>
        <p className="text-gray-600">It's great to see you again</p>
        <p className="text-gray-600">Please login to continue</p>

        {error && <div className="mt-4 text-red-500 font-medium">{error}</div>}

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-sm">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 m-10 text-left"
          >
            <div>
              <label className="block text-sm font-medium text-gray-900">
                Email
              </label>
              <div className="mt-2">
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-900">
                  Password
                </label>
                <div className="text-sm">
                  <a
                    href="#"
                    className="font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:outline-indigo-600 sm:text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-indigo-500 py-3 rounded-2xl text-white font-semibold mt-3 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Cargando..." : "Login"}
            </button>

            <Link
              href="/register"
              className="font-semibold w-full text-center text-indigo-600 hover:text-indigo-500"
            >
              Register
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
