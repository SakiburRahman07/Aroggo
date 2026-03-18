import { type DefaultSession } from "next-auth";
import type { AuthSurface } from "@/lib/auth/options";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      authSurface?: AuthSurface;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    authSurface?: AuthSurface;
  }
}
