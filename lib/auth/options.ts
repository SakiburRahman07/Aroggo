import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db/prisma";

export type AuthSurface = "staff" | "portal";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const useSecureCookies = process.env.NODE_ENV === "production";
const securePrefix = useSecureCookies ? "__Secure-" : "";
const hostPrefix = useSecureCookies ? "__Host-" : "";

function buildCookieOptions(surface: AuthSurface): NextAuthOptions["cookies"] {
  return {
    sessionToken: {
      name: `${securePrefix}aroggo.${surface}.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies
      }
    },
    callbackUrl: {
      name: `${securePrefix}aroggo.${surface}.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies
      }
    },
    csrfToken: {
      name: `${hostPrefix}aroggo.${surface}.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies
      }
    }
  };
}

async function authorizeForSurface(surface: AuthSurface, credentials: Record<string, unknown> | undefined) {
  const parsed = credentialsSchema.safeParse(credentials);

  if (!parsed.success) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    include: { profile: true }
  });

  if (!user?.passwordHash) {
    return null;
  }

  const passwordMatches = await compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return null;
  }

  if (surface === "portal") {
    const portalAccount = await db.patientPortalAccount.findFirst({
      where: {
        userId: user.id,
        portalEnabled: true
      }
    });

    if (!portalAccount) {
      return null;
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.profile?.fullName ?? user.name ?? user.email,
    authSurface: surface
  };
}

function createAuthOptions(surface: AuthSurface): NextAuthOptions {
  const signInPage = surface === "staff" ? "/login" : "/portal/login";

  return {
    adapter: PrismaAdapter(db),
    session: {
      strategy: "jwt"
    },
    cookies: buildCookieOptions(surface),
    pages: {
      signIn: signInPage
    },
    providers: [
      CredentialsProvider({
        id: "credentials",
        name: "Email and password",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
          return authorizeForSurface(surface, credentials);
        }
      })
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.sub = user.id;
          token.name = user.name;
          token.email = user.email;
          token.authSurface = surface;
        }

        token.authSurface = token.authSurface ?? surface;
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub ?? session.user.id;
          session.user.name = session.user.name ?? token.name ?? token.email ?? undefined;
          session.user.email = session.user.email ?? token.email ?? undefined;
          session.user.authSurface = token.authSurface ?? surface;
        }

        return session;
      }
    }
  };
}

export const staffAuthOptions = createAuthOptions("staff");
export const portalAuthOptions = createAuthOptions("portal");

export function getStaffAuthSession() {
  return getServerSession(staffAuthOptions);
}

export function getPortalAuthSession() {
  return getServerSession(portalAuthOptions);
}

export async function getAnyAuthSession() {
  const staffSession = await getStaffAuthSession();

  if (staffSession?.user?.id) {
    return { surface: "staff" as const, session: staffSession };
  }

  const portalSession = await getPortalAuthSession();

  if (portalSession?.user?.id) {
    return { surface: "portal" as const, session: portalSession };
  }

  return null;
}

// Legacy alias for older imports. New code should prefer explicit staff/portal helpers.
export function getAuthSession() {
  return getStaffAuthSession();
}
