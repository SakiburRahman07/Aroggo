import { z } from "zod";

export const signUpSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    workspaceName: z.string().optional(),
    timezone: z.string().default("Asia/Dhaka"),
    inviteToken: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (!value.inviteToken && !value.workspaceName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workspaceName"],
        message: "Workspace name is required"
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8)
});

