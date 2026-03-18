"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createPatient, updatePatient } from "@/features/patients/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { buildErrorRedirectUrl, rethrowIfFrameworkControlFlow } from "@/lib/errors";

export async function createPatientAction(workspaceSlug: string, formData: FormData) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "patients:write_basic");
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
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/patients/new`, error));
  }
}

export async function updatePatientAction(workspaceSlug: string, patientId: string, formData: FormData) {
  try {
    const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, "patients:write_basic");

    await updatePatient(workspace.id, patientId, viewer, {
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
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/patients/${patientId}`, error));
  }
}
