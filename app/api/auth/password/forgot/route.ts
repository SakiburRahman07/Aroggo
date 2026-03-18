import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/features/auth/service";
import { createApiErrorResponse } from "@/lib/errors/next";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await requestPasswordReset(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return createApiErrorResponse(error, { route: "POST /api/auth/password/forgot" }, "Unable to process your request.");
  }
}
