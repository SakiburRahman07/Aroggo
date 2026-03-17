import { DocumentType } from "@prisma/client";
import { z } from "zod";

export const documentUploadSchema = z.object({
  title: z.string().min(2),
  docType: z.nativeEnum(DocumentType),
  patientId: z.string().optional()
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
