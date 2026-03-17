"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createPatient, updatePatient } from "@/features/patients/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function createPatientAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write");
  const patient = await createPatient(workspace.id, membership.userId, {
    fullName: formData.get("fullName"),
    dob: formData.get("dob"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    emergencyContact: formData.get("emergencyContact"),
    notes: formData.get("notes")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "patient",
    entityId: patient.id,
    action: "CREATE"
  });

  revalidatePath(`/app/${workspaceSlug}/patients`);
  redirect(`/app/${workspaceSlug}/patients/${patient.id}`);
}

export async function updatePatientAction(workspaceSlug: string, patientId: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write");

  await updatePatient(patientId, {
    fullName: formData.get("fullName"),
    dob: formData.get("dob"),
    gender: formData.get("gender"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    emergencyContact: formData.get("emergencyContact"),
    notes: formData.get("notes")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "patient",
    entityId: patientId,
    action: "UPDATE"
  });

  revalidatePath(`/app/${workspaceSlug}/patients/${patientId}`);
}
