import { z } from "zod";

export const noteTaskSuggestionsSchema = z.object({
  summary: z.string(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      dueAt: z.string().optional()
    })
  )
});
