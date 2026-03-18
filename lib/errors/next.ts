import { NextResponse } from "next/server";
import { logAppError, normalizeAppError, toApiErrorShape } from "@/lib/errors";

export function createApiErrorResponse(
  error: unknown,
  context: Record<string, unknown>,
  fallbackMessage?: string
) {
  const appError = normalizeAppError(error, fallbackMessage);
  logAppError(appError, context);

  return NextResponse.json(
    {
      ok: false,
      error: toApiErrorShape(appError, fallbackMessage)
    },
    { status: appError.status }
  );
}
