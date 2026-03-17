"use server";

import { revalidatePath } from "next/cache";
import { generateVisitDraft } from "@/features/ai/service";
import { setVisitAiDraft, updateVisit } from "@/features/visits/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function updateVisitAction(workspaceSlug: string, visitId: string, formData: FormData) {
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, "visits:write");

  await updateVisit(workspace.id, visitId, viewer, {
    symptoms: formData.get("symptoms"),
    observations: formData.get("observations"),
    diagnosisNote: formData.get("diagnosisNote"),
    prescriptionText: formData.get("prescriptionText"),
    followUpDate: formData.get("followUpDate"),
    status: formData.get("status")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "visit",
    entityId: visitId,
    action: "UPDATE"
  });

  revalidatePath(`/app/${workspaceSlug}/visits/${visitId}`);
  revalidatePath(`/app/${workspaceSlug}/patients`);
}

export async function generateVisitDraftAction(workspaceSlug: string, visitId: string) {
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, "ai:use_clinical");
  const aiDraft = await generateVisitDraft(workspace.id, membership.userId, visitId, viewer);
  await setVisitAiDraft(workspace.id, visitId, viewer, aiDraft);

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "visit",
    entityId: visitId,
    action: "AI_QUERY"
  });

  revalidatePath(`/app/${workspaceSlug}/visits/${visitId}`);
}