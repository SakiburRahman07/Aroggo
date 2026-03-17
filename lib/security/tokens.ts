import crypto from "node:crypto";

const TOKEN_SECRET = process.env.QR_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-qr-secret";

function base64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(size = 24) {
  return crypto.randomBytes(size).toString("hex");
}

export function randomPublicId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

export function signJsonToken(payload: Record<string, unknown>) {
  const body = base64Url(JSON.stringify(payload));
  const signature = base64Url(crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest());
  return `${body}.${signature}`;
}

export function verifyJsonToken<T>(token: string): T | null {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expected = base64Url(crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest());

  if (expected !== signature) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(body).toString("utf8")) as T;
  } catch {
    return null;
  }
}
