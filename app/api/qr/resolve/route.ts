import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getQrFlowError } from "@/features/qr/errors";
import { resolvePatientQrScan } from "@/features/qr/service";
import { createApiErrorResponse } from "@/lib/errors/next";
import { getPortalAuthSession, getStaffAuthSession } from "@/lib/auth/options";

const schema = z.object({
  qr: z.string().min(1, "QR input is required."),
  intent: z.enum(["default", "check_in", "visit", "report_upload", "patient_summary"]).optional()
});

export async function POST(request: Request) {
  const staffSession = await getStaffAuthSession();
  const portalSession = await getPortalAuthSession();
  const actingSession = staffSession?.user?.id ? staffSession : portalSession;
  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const deviceInfo = headerStore.get("user-agent") ?? null;

  try {
    const body = schema.parse(await request.json());
    const publicId = body.qr.includes("/scan/") ? body.qr.split("/scan/").pop() ?? "" : body.qr;
    const result = await resolvePatientQrScan({
      publicId,
      userId: actingSession?.user?.id,
      ipAddress,
      deviceInfo,
      intent: body.intent
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const qrError = getQrFlowError(error);

    return createApiErrorResponse(qrError, {
      route: "POST /api/qr/resolve",
      userId: actingSession?.user?.id ?? null,
      ipAddress,
      deviceInfo,
      qrCode: qrError.code
    }, "Unable to resolve this QR code.");
  }
}
