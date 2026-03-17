import { z } from "zod";

export const visitSchema = z.object({
  symptoms: z.string().optional(),
  observations: z.string().optional(),
  diagnosisNote: z.string().optional(),
  prescriptionText: z.string().optional(),
  followUpDate: z.string().optional(),
  status: z.enum(["DRAFT", "COMPLETED"]).default("DRAFT")
});

