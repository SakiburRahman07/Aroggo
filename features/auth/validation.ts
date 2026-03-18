import { z } from "zod";
import { emailSchema, fullNameSchema, optionalTrimmedString, passwordSchema, requiredTrimmedString } from "@/validation/common";

export const signUpSchema = z
  .object({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    workspaceName: optionalTrimmedString(),
    timezone: requiredTrimmedString("Timezone").default("Asia/Dhaka"),
    inviteToken: optionalTrimmedString()
  })
  .superRefine((value, ctx) => {
    if (!value.inviteToken && !value.workspaceName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workspaceName"],
        message: "Workspace name is required."
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export const resetPasswordSchema = z.object({
  token: requiredTrimmedString("Reset token"),
  password: passwordSchema
});
