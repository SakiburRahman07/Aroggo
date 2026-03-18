"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAppointment, ensureVisitForAppointment, updateAppointmentStatus } from "@/features/appointments/service";
import { createNotification } from "@/features/notifications/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { buildErrorRedirectUrl, rethrowIfFrameworkControlFlow } from "@/lib/errors";

export async function createAppointmentAction(workspaceSlug: string, formData: FormData) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "appointments:write");
    const patientId = String(formData.get("patientId") ?? "") || undefined;
    const appointment = await createAppointment(workspace.id, membership.userId, {
      patientId,
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
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/appointments/new`, error, {
      searchParams: {
        patientId: String(formData.get("patientId") ?? "") || undefined
      }
    }));
  }
}

export async function updateAppointmentStatusAction(workspaceSlug: string, appointmentId: string, formData: FormData) {
  try {
    const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, "appointments:write");
    const appointment = await updateAppointmentStatus(workspace.id, appointmentId, viewer, {
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
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/appointments/${appointmentId}`, error));
  }
}

export async function openVisitFromAppointmentAction(workspaceSlug: string, appointmentId: string) {
  try {
    const { workspace, viewer } = await requireWorkspaceContext(workspaceSlug, "visits:write");
    const visit = await ensureVisitForAppointment(workspace.id, appointmentId, viewer);
    redirect(`/app/${workspaceSlug}/visits/${visit.id}`);
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/appointments/${appointmentId}`, error));
  }
}
