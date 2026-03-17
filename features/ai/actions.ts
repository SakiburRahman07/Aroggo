"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { answerGroundedQuestion, confirmMeetingTasks, generateMeetingTasks } from "@/features/ai/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function askGroundedQuestionAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "ai:use");
  const query = await answerGroundedQuestion({
    workspaceId: workspace.id,
    userId: membership.userId,
    question: String(formData.get("question") ?? ""),
    patientId: String(formData.get("patientId") ?? "") || undefined
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "ai_query",
    entityId: query.id,
    action: "AI_QUERY"
  });

  redirect(`/app/${workspaceSlug}/ai-assistant?queryId=${query.id}`);
}

export async function generateMeetingTasksAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "ai:use");
  const query = await generateMeetingTasks({
    workspaceId: workspace.id,
    userId: membership.userId,
    note: String(formData.get("note") ?? "")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "ai_query",
    entityId: query.id,
    action: "AI_QUERY"
  });

  redirect(`/app/${workspaceSlug}/ai-assistant?draftId=${query.id}`);
}

export async function confirmMeetingTasksAction(workspaceSlug: string, aiQueryId: string) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "tasks:write");
  await confirmMeetingTasks(workspace.id, membership.userId, aiQueryId);

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "ai_query",
    entityId: aiQueryId,
    action: "COMPLETE"
  });

  revalidatePath(`/app/${workspaceSlug}/tasks`);
  redirect(`/app/${workspaceSlug}/tasks`);
}

