import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password wajib diisi");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { businesses: { select: { id: true, name: true } } },
        });

        if (!user) throw new Error("Email atau password salah");

        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) throw new Error("Email atau password salah");

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          hasBusiness: user.businesses.length > 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.hasBusiness = (user as any).hasBusiness;
      }
      if (trigger === "update" && session?.hasBusiness !== undefined) {
        token.hasBusiness = session.hasBusiness;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).hasBusiness = token.hasBusiness;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "wattwise-dev-secret-key",
};