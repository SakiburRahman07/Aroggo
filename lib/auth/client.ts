import type { AuthSurface } from "@/lib/auth/options";

const authBasePaths: Record<AuthSurface, string> = {
  staff: "/api/auth/staff",
  portal: "/api/auth/portal"
};

function getAuthBasePath(surface: AuthSurface) {
  return authBasePaths[surface];
}

async function getSurfaceCsrfToken(surface: AuthSurface) {
  const response = await fetch(`${getAuthBasePath(surface)}/csrf`, {
    cache: "no-store",
    credentials: "same-origin"
  });

  if (!response.ok) {
    throw new Error("AUTH_CSRF_FAILED");
  }

  const payload = (await response.json()) as { csrfToken?: string };

  if (!payload.csrfToken) {
    throw new Error("AUTH_CSRF_FAILED");
  }

  return payload.csrfToken;
}

function extractError(url: string | null) {
  if (!url) {
    return null;
  }

  return new URL(url, window.location.origin).searchParams.get("error");
}

export async function signInToAuthSurface(params: {
  surface: AuthSurface;
  email: string;
  password: string;
  callbackUrl: string;
}) {
  const csrfToken = await getSurfaceCsrfToken(params.surface);
  const response = await fetch(`${getAuthBasePath(params.surface)}/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      email: params.email,
      password: params.password,
      csrfToken,
      callbackUrl: params.callbackUrl,
      json: "true"
    })
  });

  const payload = (await response.json()) as { url?: string };
  const url = payload.url ?? params.callbackUrl;
  const error = extractError(payload.url ?? null);

  return {
    error,
    ok: response.ok && !error,
    status: response.status,
    url: error ? null : url
  };
}

export async function signOutFromAuthSurface(params: {
  surface: AuthSurface;
  callbackUrl: string;
}) {
  const csrfToken = await getSurfaceCsrfToken(params.surface);
  const response = await fetch(`${getAuthBasePath(params.surface)}/signout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: params.callbackUrl,
      json: "true"
    })
  });

  const payload = (await response.json()) as { url?: string };

  return {
    ok: response.ok,
    status: response.status,
    url: payload.url ?? params.callbackUrl
  };
}
