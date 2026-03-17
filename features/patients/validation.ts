import { Gender } from "@prisma/client";
import { z } from "zod";

export const patientSchema = z.object({
  fullName: z.string().min(2),
  dob: z.string().optional(),
  gender: z.nativeEnum(Gender).default(Gender.UNDISCLOSED),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  notes: z.string().optional()
});
