"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { updateAppointmentStatus } from "@/features/appointments/service";

export async function quickCheckInFromScanAction(workspaceSlug: string, appointmentId: string) {
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, "appointments:write");

  await updateAppointmentStatus(workspace.id, appointmentId, viewer, {
    status: "CHECKED_IN"
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "appointment",
    entityId: appointmentId,
    action: "STATUS_CHANGE",
    changesJson: {
      source: "qr_scan",
      nextStatus: "CHECKED_IN"
    }
  });

  revalidatePath(`/app/${workspaceSlug}/appointments/${appointmentId}`);
  revalidatePath(`/app/${workspaceSlug}/scan`);
  redirect(`/app/${workspaceSlug}/appointments/${appointmentId}?scan=front-desk&checkedIn=1`);
}
