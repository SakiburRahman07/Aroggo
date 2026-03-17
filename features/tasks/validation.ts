import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assigneeUserId: z.string().optional(),
  dueAt: z.string().optional(),
  patientId: z.string().optional(),
  appointmentId: z.string().optional()
});

export const taskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus)
});

export const taskCommentSchema = z.object({
  content: z.string().min(1)
});
