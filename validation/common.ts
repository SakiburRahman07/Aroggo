import { z } from "zod";

const namePattern = /^[\p{L}]+(?:[\p{L}\s'-]*[\p{L}])?$/u;

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

export const requiredTrimmedString = (label: string, minLength = 1) =>
  z.preprocess(
    trimString,
    z
      .string({ required_error: `${label} is required.` })
      .min(minLength, `${label} is required.`)
  );

export const optionalTrimmedString = () =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().optional());

export const emailSchema = z.preprocess(
  trimString,
  z
    .string({ required_error: "Email is required." })
    .min(1, "Email is required.")
    .email("Enter a valid email address.")
);

export const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().email("Enter a valid email address.").optional());

export const fullNameSchema = z.preprocess(
  trimString,
  z
    .string({ required_error: "Full name is required." })
    .min(2, "Full name is required.")
    .max(80, "Full name must be 80 characters or fewer.")
    .regex(namePattern, "Name can only contain letters, spaces, apostrophes, and hyphens.")
);

export const passwordSchema = z
  .string({ required_error: "Password is required." })
  .min(8, "Password must be at least 8 characters.")
  .refine((value) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value), {
    message: "Use at least 8 characters with uppercase, lowercase, and a number."
  });
