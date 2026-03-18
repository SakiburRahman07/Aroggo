import { Gender } from "@prisma/client";
import { z } from "zod";
import { fullNameSchema, optionalEmailSchema, optionalTrimmedString, requiredTrimmedString } from "@/validation/common";

export const patientSchema = z.object({
  fullName: fullNameSchema,
  dob: optionalTrimmedString(),
  gender: z.nativeEnum(Gender).default(Gender.UNDISCLOSED),
  phone: requiredTrimmedString("Phone", 6),
  email: optionalEmailSchema,
  address: optionalTrimmedString(),
  emergencyContact: optionalTrimmedString(),
  notes: optionalTrimmedString()
});
