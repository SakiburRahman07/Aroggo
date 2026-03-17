import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/options";
import { resolvePatientQrScan } from "@/features/qr/service";

const schema = z.object({
  qr: z.string().min(1),
  intent: z.enum(["default", "check_in", "visit", "report_upload", "patient_summary"]).optional()
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const deviceInfo = headerStore.get("user-agent") ?? null;

  try {
    const body = schema.parse(await request.json());
    const publicId = body.qr.includes("/scan/") ? body.qr.split("/scan/").pop() ?? "" : body.qr;
    const result = await resolvePatientQrScan({
      publicId,
      userId: session?.user?.id,
      ipAddress,
      deviceInfo,
      intent: body.intent
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR_INVALID";
    const status = message === "QR_UNAUTHORIZED" ? 403 : message === "QR_INVALID" ? 404 : message === "QR_EXPIRED" || message === "QR_REVOKED" ? 410 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
