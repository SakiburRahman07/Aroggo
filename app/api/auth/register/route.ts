import { NextResponse } from "next/server";
import { registerUser } from "@/features/auth/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await registerUser(payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to register"
      },
      { status: 400 }
    );
  }
}

