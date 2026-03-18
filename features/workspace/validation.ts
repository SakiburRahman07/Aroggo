import { Role } from "@prisma/client";
import { z } from "zod";
import { emailSchema, optionalTrimmedString, requiredTrimmedString } from "@/validation/common";

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.nativeEnum(Role, { message: "Select a valid role." }),
  departmentId: optionalTrimmedString()
});

export const workspaceSettingsSchema = z.object({
  name: requiredTrimmedString("Workspace name", 2),
  timezone: requiredTrimmedString("Timezone", 2),
  patientPortalEnabled: z.boolean().default(true),
  qrEnabled: z.boolean().default(true),
  kioskModeEnabled: z.boolean().default(false)
});
