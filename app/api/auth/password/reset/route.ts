import { NextResponse } from "next/server";
import { resetPassword } from "@/features/auth/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await resetPassword(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to reset password"
      },
      { status: 400 }
    );
  }
}

