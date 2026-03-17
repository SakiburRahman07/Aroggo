import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/features/auth/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await requestPasswordReset(payload);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to process request" }, { status: 400 });
  }
}
