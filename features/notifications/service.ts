import { db } from "@/lib/db/prisma";

interface NotificationInput {
  workspaceId: string;
  userId: string;
  type: "INVITE" | "TASK_ASSIGNED" | "TASK_OVERDUE" | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_REMINDER" | "DOCUMENT_PROCESSED" | "SYSTEM";
  title: string;
  body: string;
  payloadJson?: Record<string, unknown>;
}

export async function createNotification(input: NotificationInput) {
  return db.notification.create({
    data: {
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payloadJson: input.payloadJson as never
    }
  });
}

export async function listNotifications(workspaceId: string, userId: string) {
  return db.notification.findMany({
    where: {
      workspaceId,
      userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function markAllNotificationsRead(workspaceId: string, userId: string) {
  return db.notification.updateMany({
    where: {
      workspaceId,
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });
}
