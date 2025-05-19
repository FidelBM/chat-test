import { NextRequest, NextResponse } from "next/server";

// Rutas protegidas y públicas
const protectedRoutes = ["/chats"];
const publicRoutes = ["/login", "/register", "/"];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);

  // Leer el refresh token de la cookie
  const refreshToken = req.cookies.get("refreshToken")?.value;

  let accessToken: string | null = null;

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
        console.log("Access Token:", data.accessToken);
        accessToken = data.accessToken;
      }
    } catch (error) {
      console.error("Error fetching accessToken:", error);
    }
  }

  // Si intenta entrar a una ruta protegida sin accessToken → redirigir a login
  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Si está logueado e intenta entrar a login/signup/home → redirigir a dashboard
  if (isPublicRoute && accessToken && !path.startsWith("/chats")) {
    return NextResponse.redirect(new URL("/chats", req.nextUrl));
  }

  return NextResponse.next();
}

// Excluir rutas estáticas y API
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
