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
        });

        if (!usuario || !usuario.activo) return null;

        const valido = await bcrypt.compare(
          credentials.password as string,
          usuario.passwordHash
        );

        if (!valido) return null;

        return { id: usuario.id, name: usuario.nombre, email: usuario.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      // token.id set on new sign-ins; token.sub always present as fallback
      session.user.id = (token.id ?? token.sub) as string;
      return session;
    },
  },
});
