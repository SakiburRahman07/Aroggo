"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAppointment, ensureVisitForAppointment, updateAppointmentStatus } from "@/features/appointments/service";
import { createNotification } from "@/features/notifications/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function createAppointmentAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "appointments:write");
  const appointment = await createAppointment(workspace.id, membership.userId, {
    patientId: formData.get("patientId"),
    doctorUserId: formData.get("doctorUserId"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    reason: formData.get("reason"),
    notes: formData.get("notes")
  });

  await createNotification({
    workspaceId: workspace.id,
    userId: appointment.doctorUserId,
    type: "APPOINTMENT_CONFIRMED",
    title: "New appointment scheduled",
    body: `A new appointment has been scheduled for ${appointment.scheduledAt.toLocaleString()}.`,
    payloadJson: {
      appointmentId: appointment.id
    }
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "appointment",
    entityId: appointment.id,
    action: "CREATE"
  });

  revalidatePath(`/app/${workspaceSlug}/appointments`);
  redirect(`/app/${workspaceSlug}/appointments/${appointment.id}`);
}

export async function updateAppointmentStatusAction(workspaceSlug: string, appointmentId: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "appointments:write");
  const appointment = await updateAppointmentStatus(appointmentId, {
    status: formData.get("status")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "appointment",
    entityId: appointment.id,
    action: "STATUS_CHANGE"
  });

  revalidatePath(`/app/${workspaceSlug}/appointments/${appointmentId}`);
  revalidatePath(`/app/${workspaceSlug}/appointments`);
}

export async function openVisitFromAppointmentAction(workspaceSlug: string, appointmentId: string, doctorUserId: string, patientId: string) {
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "visits:write");
  const visit = await ensureVisitForAppointment(workspace.id, appointmentId, doctorUserId, patientId);
  redirect(`/app/${workspaceSlug}/visits/${visit.id}`);
}
