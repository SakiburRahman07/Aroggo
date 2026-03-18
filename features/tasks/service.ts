import { db } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { buildTaskVisibilityWhere, type ViewerContext } from "@/lib/security/scopes";
import { taskCommentSchema, taskSchema, taskStatusSchema } from "@/features/tasks/validation";

async function ensureVisibleTask(workspaceId: string, taskId: string, viewer: ViewerContext) {
  const task = await db.task.findFirst({
    where: {
      AND: [buildTaskVisibilityWhere(workspaceId, viewer), { id: taskId }]
    },
    select: { id: true }
  });

  if (!task) {
    throw new AppError({
      code: "NOT_FOUND_ERROR",
      message: "Task not found in current access scope.",
      userMessage: "Task not found in the current access scope."
    });
  }

  return task;
}

export async function listTasks(workspaceId: string, viewer: ViewerContext) {
  return db.task.findMany({
    where: buildTaskVisibilityWhere(workspaceId, viewer),
    include: {
      patient: true,
      appointment: true,
      assignee: {
        include: { profile: true }
      },
      comments: {
        include: {
          user: {
            include: { profile: true }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }]
  });
}

export async function createTask(workspaceId: string, createdById: string, input: unknown) {
  const data = taskSchema.parse(input);

  return db.task.create({
    data: {
      workspaceId,
      createdById,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      assigneeUserId: data.assigneeUserId || null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      patientId: data.patientId || null,
      appointmentId: data.appointmentId || null
    }
  });
}

export async function updateTaskStatus(workspaceId: string, taskId: string, viewer: ViewerContext, input: unknown) {
  const data = taskStatusSchema.parse(input);
  await ensureVisibleTask(workspaceId, taskId, viewer);

  return db.task.update({
    where: { id: taskId },
    data: {
      status: data.status,
      completedAt: data.status === "COMPLETED" ? new Date() : null
    }
  });
}

export async function addTaskComment(workspaceId: string, taskId: string, viewer: ViewerContext, input: unknown) {
  const data = taskCommentSchema.parse(input);
  await ensureVisibleTask(workspaceId, taskId, viewer);

  return db.taskComment.create({
    data: {
      taskId,
      userId: viewer.userId,
      content: data.content
    }
  });
}

export async function createTasksFromSuggestions(
  workspaceId: string,
  createdById: string,
  suggestions: Array<{
    title: string;
    description?: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueAt?: string;
  }>
) {
  if (suggestions.length === 0) {
    return [];
  }

  await db.task.createMany({
    data: suggestions.map((item) => ({
      workspaceId,
      createdById,
      title: item.title,
      description: item.description || null,
      priority: item.priority ?? "MEDIUM",
      dueAt: item.dueAt ? new Date(item.dueAt) : null
    }))
  });

  return db.task.findMany({
    where: {
      workspaceId,
      createdById
    },
    orderBy: { createdAt: "desc" },
    take: suggestions.length
  });
}

