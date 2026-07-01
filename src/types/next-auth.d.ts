import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasBusiness: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    hasBusiness?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    hasBusiness: boolean;
  }
}