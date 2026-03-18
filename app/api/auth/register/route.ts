import { NextResponse } from "next/server";
import { registerUser } from "@/features/auth/service";
import { createApiErrorResponse } from "@/lib/errors/next";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await registerUser(payload);
    return NextResponse.json({ ok: true, data: result }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, { route: "POST /api/auth/register" }, "Unable to register your account.");
  }
}
