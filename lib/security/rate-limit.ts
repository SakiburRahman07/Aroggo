import { AppError } from "@/lib/errors";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function enforceSimpleRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new AppError({
      code: "RATE_LIMIT_ERROR",
      message: "RATE_LIMITED",
      userMessage: "Too many requests were made. Please wait a moment and try again."
    });
  }

  bucket.count += 1;
  buckets.set(key, bucket);
}
