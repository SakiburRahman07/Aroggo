import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

const requiredFormString = (minLength: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(minLength)
  );

const optionalFormString = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return value;
}, z.string().optional());

const taskPriorityField = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return TaskPriority.MEDIUM;
  }

  return value;
}, z.nativeEnum(TaskPriority));

export const taskSchema = z.object({
  title: requiredFormString(3),
  description: optionalFormString,
  priority: taskPriorityField,
  assigneeUserId: optionalFormString,
  dueAt: optionalFormString,
  patientId: optionalFormString,
  appointmentId: optionalFormString
});

export const taskStatusSchema = z.object({
  status: z.preprocess((value) => (typeof value === "string" ? value : value), z.nativeEnum(TaskStatus))
});

export const taskCommentSchema = z.object({
  content: requiredFormString(1)
});