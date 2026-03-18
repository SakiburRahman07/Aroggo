import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolvePatientQrScan } from "@/features/qr/service";
import { getPortalAuthSession, getStaffAuthSession } from "@/lib/auth/options";

export default async function ScanPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const staffSession = await getStaffAuthSession();
  const portalSession = await getPortalAuthSession();
  const actingSession = staffSession?.user?.id ? staffSession : portalSession;
  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const deviceInfo = headerStore.get("user-agent") ?? null;

  try {
    const result = await resolvePatientQrScan({
      publicId,
      // If both sessions exist in one browser, QR routing still needs one actor.
      // We prefer the staff session because clinic scan workflows are staff-first,
      // but separate cookie namespaces are what prevents portal and staff logins
      // from overwriting each other in the first place.
      userId: actingSession?.user?.id,
      ipAddress,
      deviceInfo
    });
    redirect(result.redirectTo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR_INVALID";

    if (staffSession?.user?.id) {
      const target = message === "QR_REVOKED"
        ? "/login?error=revoked"
        : message === "QR_EXPIRED"
          ? "/login?error=expired"
          : message === "QR_UNAUTHORIZED"
            ? "/login?error=unauthorized"
            : "/login?error=invalid";
      redirect(target);
    }

    const target = message === "QR_REVOKED"
      ? "/portal/login?error=revoked"
      : message === "QR_EXPIRED"
        ? "/portal/login?error=expired"
        : message === "QR_UNAUTHORIZED"
          ? "/portal/login?error=unauthorized"
          : "/portal/login?error=invalid";
    redirect(target);
  }
}
