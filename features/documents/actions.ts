"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/features/notifications/service";
import { uploadAndProcessDocument } from "@/features/documents/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function uploadDocumentAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "documents:write");
  const documentId = await uploadAndProcessDocument({
    workspaceId: workspace.id,
    userId: membership.userId,
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
}

