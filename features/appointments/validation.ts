import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";
import { optionalTrimmedString, requiredTrimmedString } from "@/validation/common";

export const appointmentSchema = z.object({
  patientId: requiredTrimmedString("Patient"),
  doctorUserId: requiredTrimmedString("Doctor"),
  scheduledAt: requiredTrimmedString("Appointment date and time").refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid appointment date and time."
  }),
  durationMinutes: z.coerce.number().min(10, "Duration must be at least 10 minutes.").max(240, "Duration cannot exceed 240 minutes."),
  reason: requiredTrimmedString("Reason", 3),
  notes: optionalTrimmedString()
});

export const appointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, { message: "Select a valid appointment status." })
});
