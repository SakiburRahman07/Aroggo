import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getQrFlowError, getScanErrorQueryValue } from "@/features/qr/errors";
import { resolvePatientQrScan } from "@/features/qr/service";
import { getPortalAuthSession, getStaffAuthSession } from "@/lib/auth/options";
import { getUserWorkspaces } from "@/lib/auth/session";

export default async function ScanPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const staffSession = await getStaffAuthSession();
  const portalSession = await getPortalAuthSession();
  const actingSession = staffSession?.user?.id ? staffSession : portalSession;
  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const deviceInfo = headerStore.get("user-agent") ?? null;

  let result: Awaited<ReturnType<typeof resolvePatientQrScan>>;

  try {
    result = await resolvePatientQrScan({
      publicId,
      // If both sessions exist in one browser, QR routing still needs one actor.
      // We prefer the staff session because clinic scan workflows are staff-first,
      // but separate cookie namespaces are what prevents portal and staff logins
      // from overwriting each other in the first place.
      userId: actingSession?.user?.id,
      ipAddress,
      deviceInfo
    });
  } catch (error) {
    const qrError = getQrFlowError(error);

    console.error("[scan] resolution-failed", {
      publicId,
      code: qrError.code,
      message: qrError.message,
      workspaceSlug: qrError.workspaceSlug,
      workspaceId: qrError.workspaceId,
      patientId: qrError.patientId,
      actorUserId: actingSession?.user?.id ?? null
    });

    if (staffSession?.user?.id) {
      if (qrError.code === "STAFF_SESSION_REQUIRED") {
        redirect("/login?error=session");
      }

      const workspaces = await getUserWorkspaces();
      const workspaceMembership = qrError.workspaceSlug
        ? workspaces.find((membership) => membership.workspace.slug === qrError.workspaceSlug)
        : workspaces[0];

      if (workspaceMembership) {
        const search = new URLSearchParams({
          error: getScanErrorQueryValue(qrError.code),
          scanned: publicId
        });

        if (qrError.patientId) {
          search.set("patientId", qrError.patientId);
        }

        redirect(`/app/${workspaceMembership.workspace.slug}/scan?${search.toString()}`);
      }

      redirect("/login?error=unauthorized");
    }

    const target = qrError.code === "QR_REVOKED"
      ? "/portal/login?error=revoked"
      : qrError.code === "QR_EXPIRED"
        ? "/portal/login?error=expired"
        : qrError.code === "QR_RATE_LIMITED"
          ? "/portal/login?error=workflow"
          : qrError.code === "QR_UNAUTHORIZED" || qrError.code === "PATIENT_SCOPE_DENIED"
            ? "/portal/login?error=unauthorized"
            : qrError.code === "STAFF_SESSION_REQUIRED"
              ? "/portal/login?error=account"
              : "/portal/login?error=invalid";
    redirect(target);
  }

  redirect(result.redirectTo);
}
