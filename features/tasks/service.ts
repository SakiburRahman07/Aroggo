import { db } from "@/lib/db/prisma";
import { taskCommentSchema, taskSchema, taskStatusSchema } from "@/features/tasks/validation";

export async function listTasks(workspaceId: string) {
  return db.task.findMany({
    where: { workspaceId },
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
    orderBy: [
      { dueAt: "asc" },
      { createdAt: "desc" }
    ]
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

export async function updateTaskStatus(taskId: string, input: unknown) {
  const data = taskStatusSchema.parse(input);

  return db.task.update({
    where: { id: taskId },
    data: {
      status: data.status,
      completedAt: data.status === "COMPLETED" ? new Date() : null
    }
  });
}

export async function addTaskComment(taskId: string, userId: string, input: unknown) {
  const data = taskCommentSchema.parse(input);

  return db.taskComment.create({
    data: {
      taskId,
      userId,
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

