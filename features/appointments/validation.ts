import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorUserId: z.string().min(1),
  scheduledAt: z.string().min(1),
  durationMinutes: z.coerce.number().min(10).max(240),
  reason: z.string().min(3),
  notes: z.string().optional()
});

export const appointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus)
});

