import NextAuth from "next-auth";
import { portalAuthOptions } from "@/lib/auth/options";

const handler = NextAuth(portalAuthOptions);

export { handler as GET, handler as POST };
