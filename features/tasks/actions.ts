"use server";

import { revalidatePath } from "next/cache";
import { createNotification } from "@/features/notifications/service";
import { addTaskComment, createTask, updateTaskStatus } from "@/features/tasks/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function createTaskAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "tasks:write");
  const task = await createTask(workspace.id, membership.userId, {
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    assigneeUserId: formData.get("assigneeUserId"),
    dueAt: formData.get("dueAt"),
    patientId: formData.get("patientId"),
    appointmentId: formData.get("appointmentId")
  });

  if (task.assigneeUserId) {
    await createNotification({
      workspaceId: workspace.id,
      userId: task.assigneeUserId,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      body: task.title,
      payloadJson: {
        taskId: task.id
      }
    });
  }

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "task",
    entityId: task.id,
    action: "CREATE"
  });

  revalidatePath(`/app/${workspaceSlug}/tasks`);
}

export async function updateTaskStatusAction(workspaceSlug: string, taskId: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "tasks:write");
  await updateTaskStatus(taskId, {
    status: formData.get("status")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "task",
    entityId: taskId,
    action: "STATUS_CHANGE"
  });

  revalidatePath(`/app/${workspaceSlug}/tasks`);
}

export async function addTaskCommentAction(workspaceSlug: string, taskId: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "tasks:write");
  await addTaskComment(taskId, membership.userId, {
    content: formData.get("content")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "task_comment",
    entityId: taskId,
    action: "CREATE"
  });

  revalidatePath(`/app/${workspaceSlug}/tasks`);
}
