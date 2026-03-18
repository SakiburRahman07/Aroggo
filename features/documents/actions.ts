"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/features/notifications/service";
import { uploadAndProcessDocument } from "@/features/documents/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { buildErrorRedirectUrl, rethrowIfFrameworkControlFlow } from "@/lib/errors";

export async function uploadDocumentAction(workspaceSlug: string, formData: FormData) {
  try {
    const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["documents:write_clinical", "documents:write_lab", "reports:upload"]);
    const patientId = String(formData.get("patientId") ?? "") || undefined;
    const documentId = await uploadAndProcessDocument({
      workspaceId: workspace.id,
      userId: membership.userId,
      role: membership.role,
      formData
    });

    await createNotification({
      workspaceId: workspace.id,
      userId: membership.userId,
      type: "DOCUMENT_PROCESSED",
      title: "Document processed",
      body: "Your upload is ready for review.",
      payloadJson: {
        documentId
      }
    });

    await recordAuditLog({
      workspaceId: workspace.id,
      actorUserId: membership.userId,
      entityType: "document",
      entityId: documentId,
      action: "PROCESS_DOCUMENT"
    });

    revalidatePath(`/app/${workspaceSlug}/documents`);
    redirect(`/app/${workspaceSlug}/documents/${documentId}`);
  } catch (error) {
    rethrowIfFrameworkControlFlow(error);
    redirect(buildErrorRedirectUrl(`/app/${workspaceSlug}/documents`, error, {
      searchParams: {
        patientId: String(formData.get("patientId") ?? "") || undefined
      }
    }));
  }
}
