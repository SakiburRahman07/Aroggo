import { DocumentType } from "@prisma/client";
import { z } from "zod";
import { optionalTrimmedString, requiredTrimmedString } from "@/validation/common";

export const documentUploadSchema = z.object({
  title: requiredTrimmedString("Title", 2),
  docType: z.nativeEnum(DocumentType, { message: "Select a valid document type." }),
  patientId: optionalTrimmedString()
});

export const structuredExtractionSchema = z.object({
  patientName: z.string().optional(),
  reportDate: z.string().optional(),
  labName: z.string().optional(),
  doctorName: z.string().optional(),
  tests: z
    .array(
      z.object({
        name: z.string(),
        result: z.string().optional(),
        abnormal: z.boolean().optional()
      })
    )
    .default([])
});
