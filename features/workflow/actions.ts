"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";
import {
  createLabOrderForPatient,
  getWorkflowSurfacePath,
  transitionAppointmentWorkflow,
  transitionLabOrderStatus
} from "@/features/workflow/service";

export async function movePatientWorkflowAction(
  workspaceSlug: string,
  patientId: string,
  appointmentId: string,
  nextState:
    | "ARRIVED"
    | "READY_FOR_PROVIDER"
    | "IN_CONSULTATION"
    | "REVIEWED"
    | "CHECKED_OUT"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW"
) {
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, ["appointments:write", "visits:write"]);

  await transitionAppointmentWorkflow({
    workspaceId: workspace.id,
    appointmentId,
    viewer,
    nextState
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "patient_workflow",
    entityId: appointmentId,
    action: "STATUS_CHANGE",
    changesJson: {
      patientId,
      nextState
    }
  });

  revalidatePath(`/app/${workspaceSlug}/workflow/front-desk/${patientId}`);
  revalidatePath(`/app/${workspaceSlug}/workflow/doctor/${patientId}`);
  revalidatePath(`/app/${workspaceSlug}/workflow/operations/${patientId}`);
}

export async function createLabOrderAction(workspaceSlug: string, patientId: string, formData: FormData) {
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, ["visits:write", "patients:read_clinical"]);

  const appointmentId = String(formData.get("appointmentId") ?? "") || null;
  const visitId = String(formData.get("visitId") ?? "") || null;
  const testName = String(formData.get("testName") ?? "").trim();
  const indication = String(formData.get("indication") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!testName) {
    throw new Error("Test name is required.");
  }

  const order = await createLabOrderForPatient({
    workspaceId: workspace.id,
    patientId,
    doctorUserId: membership.userId,
    viewer,
    testName,
    indication,
    notes,
    appointmentId,
    visitId
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "lab_order",
    entityId: order.id,
    action: "CREATE",
    changesJson: {
      patientId,
      appointmentId,
      visitId,
      testName
    }
  });

  revalidatePath(`/app/${workspaceSlug}/workflow/doctor/${patientId}`);
  revalidatePath(`/app/${workspaceSlug}/workflow/lab/${patientId}`);
}

export async function updateLabOrderStatusAction(workspaceSlug: string, patientId: string, orderId: string, nextStatus: "SAMPLE_COLLECTED" | "PROCESSING" | "RESULT_UPLOADED" | "DOCTOR_REVIEW_PENDING" | "DOCTOR_REVIEWED" | "RELEASED_TO_PATIENT") {
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, ["documents:write_lab", "visits:write", "reports:upload"]);

  await transitionLabOrderStatus({
    workspaceId: workspace.id,
    orderId,
    viewer,
    processedByUserId: membership.userId,
    nextStatus
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "lab_order",
    entityId: orderId,
    action: "STATUS_CHANGE",
    changesJson: {
      patientId,
      nextStatus
    }
  });

  revalidatePath(`/app/${workspaceSlug}/workflow/lab/${patientId}`);
  revalidatePath(`/app/${workspaceSlug}/workflow/doctor/${patientId}`);
  revalidatePath(`/app/${workspaceSlug}/workflow/operations/${patientId}`);
}

export async function openResolvedPatientWorkflowAction(workspaceSlug: string, patientId: string, surface: "front-desk" | "doctor" | "lab" | "operations" | "admin") {
  await requireWorkspaceContext(workspaceSlug);
  redirect(getWorkflowSurfacePath(workspaceSlug, surface, patientId));
}

