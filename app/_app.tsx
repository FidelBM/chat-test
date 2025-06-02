import { useEffect } from "react";
import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    console.log("App mounted");
    const refreshAccessToken = async () => {
      const cookies = document.cookie.split("; ").reduce((acc: any, curr) => {
        const [key, value] = curr.split("=");
        acc[key] = value;
        return acc;
      }, {});

      const refreshToken = cookies["refreshToken"];

      if (refreshToken) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}users/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            console.log("Access Token:", data.accessToken);
            localStorage.setItem("accessToken", data.accessToken);
            // Puedes guardar el accessToken en memoria, localStorage, etc. (con precaución)
          } else {
            console.warn("No se pudo renovar el token");
          }
        } catch (err) {
          console.error("Error al renovar el token:", err);
        }
      }
    };

    refreshAccessToken();
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
