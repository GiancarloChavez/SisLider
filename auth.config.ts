import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn    = !!auth?.user;
      const isLoginPage   = nextUrl.pathname === "/login";
      const isDocenteRoute = nextUrl.pathname.startsWith("/docente");
      const rol           = (auth as any)?.user?.rol as string | undefined;

      // Unauthenticated → login
      if (!isLoggedIn && !isLoginPage) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      // Already logged in → redirect away from login based on role
      if (isLoggedIn && isLoginPage) {
        const dest = rol === "docente" ? "/docente/perfil" : "/dashboard";
        return Response.redirect(new URL(dest, nextUrl));
      }

      // Admin trying to access docente routes → redirect to dashboard
      if (isLoggedIn && isDocenteRoute && rol !== "docente") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Docente trying to access admin routes → redirect to their portal
      if (isLoggedIn && !isDocenteRoute && !isLoginPage && rol === "docente") {
        return Response.redirect(new URL("/docente/perfil", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
