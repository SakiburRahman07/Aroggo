import { Role } from "@prisma/client";
import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role),
  departmentId: z.string().optional()
});

export const workspaceSettingsSchema = z.object({
  name: z.string().min(2),
  timezone: z.string().min(2)
});
