import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolvePatientQrScan } from "@/features/qr/service";
import { getAuthSession } from "@/lib/auth/options";

export default async function ScanPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const session = await getAuthSession();
  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const deviceInfo = headerStore.get("user-agent") ?? null;

  try {
    const result = await resolvePatientQrScan({
      publicId,
      userId: session?.user?.id,
      ipAddress,
      deviceInfo
    });
    redirect(result.redirectTo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR_INVALID";
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
