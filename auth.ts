import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email as string },
          include: { docente: { select: { id: true } } },
        });

        if (!usuario || !usuario.activo) return null;

        const valido = await bcrypt.compare(
          credentials.password as string,
          usuario.passwordHash
        );

        if (!valido) return null;

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          docenteId: usuario.docente?.id ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if ((user as any)?.rol)       token.rol       = (user as any).rol;
      if ((user as any)?.docenteId !== undefined) token.docenteId = (user as any).docenteId;
      return token;
    },
    session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id:        (token.id       ?? token.sub ?? "") as string,
          rol:       (token.rol       ?? "admin")        as string,
          docenteId: (token.docenteId ?? null)           as string | null,
        },
      };
    },
  },
});
