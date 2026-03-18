import { z } from "zod";
import { optionalTrimmedString } from "@/validation/common";

export const visitSchema = z.object({
  symptoms: optionalTrimmedString(),
  observations: optionalTrimmedString(),
  diagnosisNote: optionalTrimmedString(),
  prescriptionText: optionalTrimmedString(),
  followUpDate: optionalTrimmedString(),
  status: z.enum(["DRAFT", "COMPLETED"]).default("DRAFT")
});
