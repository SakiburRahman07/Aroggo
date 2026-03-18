import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { QrFlowError, type QrErrorCode } from "@/features/qr/errors";

export const APP_ERROR_CODES = [
  "VALIDATION_ERROR",
  "CONFLICT_ERROR",
  "AUTHENTICATION_ERROR",
  "AUTHORIZATION_ERROR",
  "NOT_FOUND_ERROR",
  "BUSINESS_RULE_ERROR",
  "EXTERNAL_SERVICE_ERROR",
  "RATE_LIMIT_ERROR",
  "REDIRECT_CONTROL_FLOW",
  "INTERNAL_ERROR"
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];
export type FieldErrors = Record<string, string[]>;

export type ApiErrorShape = {
  code: AppErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

type AppErrorOptions = {
  code: AppErrorCode;
  message: string;
  userMessage?: string;
  status?: number;
  fieldErrors?: FieldErrors;
  details?: Record<string, unknown>;
  cause?: unknown;
};

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: "Please review the highlighted fields and try again.",
  CONFLICT_ERROR: "This request conflicts with existing data.",
  AUTHENTICATION_ERROR: "You need to sign in to continue.",
  AUTHORIZATION_ERROR: "You do not have permission to perform this action.",
  NOT_FOUND_ERROR: "The requested record could not be found.",
  BUSINESS_RULE_ERROR: "This action could not be completed.",
  EXTERNAL_SERVICE_ERROR: "A required service is unavailable right now. Please try again.",
  RATE_LIMIT_ERROR: "Too many requests were made. Please wait a moment and try again.",
  REDIRECT_CONTROL_FLOW: "The request was redirected.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again."
};

const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  CONFLICT_ERROR: 409,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  BUSINESS_RULE_ERROR: 422,
  EXTERNAL_SERVICE_ERROR: 503,
  RATE_LIMIT_ERROR: 429,
  REDIRECT_CONTROL_FLOW: 307,
  INTERNAL_ERROR: 500
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly userMessage: string;
  readonly fieldErrors?: FieldErrors;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status ?? DEFAULT_STATUS[options.code];
    this.userMessage = options.userMessage ?? options.message ?? DEFAULT_MESSAGES[options.code];
    this.fieldErrors = options.fieldErrors;
    this.details = options.details;
    this.cause = options.cause;
  }
}

export function rethrowIfFrameworkControlFlow(error: unknown) {
  if (isRedirectError(error)) {
    throw error;
  }
}

function toFieldErrors(error: ZodError): FieldErrors | undefined {
  const flattened = error.flatten().fieldErrors;
  const entries = Object.entries(flattened).filter(([, messages]) => Array.isArray(messages) && messages.length > 0);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as FieldErrors;
}

function getFirstFieldMessage(fieldErrors?: FieldErrors) {
  if (!fieldErrors) {
    return null;
  }

  for (const messages of Object.values(fieldErrors)) {
    if (messages.length > 0) {
      return messages[0];
    }
  }

  return null;
}

export function fromZodError(error: ZodError, fallbackMessage?: string) {
  const fieldErrors = toFieldErrors(error);
  const firstFieldMessage = getFirstFieldMessage(fieldErrors);

  return new AppError({
    code: "VALIDATION_ERROR",
    message: error.message,
    userMessage: firstFieldMessage ?? fallbackMessage ?? DEFAULT_MESSAGES.VALIDATION_ERROR,
    fieldErrors
  });
}

function mapPrismaUniqueConstraint(error: Prisma.PrismaClientKnownRequestError) {
  const target = Array.isArray(error.meta?.target) ? error.meta?.target.map(String) : [];
  const targetSet = new Set(target);

  if (targetSet.has("email")) {
    return new AppError({
      code: "CONFLICT_ERROR",
      message: error.message,
      userMessage: "An account with this email already exists.",
      fieldErrors: {
        email: ["An account with this email already exists."]
      },
      details: {
        prismaCode: error.code,
        target
      },
      cause: error
    });
  }

  if (targetSet.has("workspaceId") && targetSet.has("userId")) {
    return new AppError({
      code: "CONFLICT_ERROR",
      message: error.message,
      userMessage: "This user is already a member of the workspace.",
      details: {
        prismaCode: error.code,
        target
      },
      cause: error
    });
  }

  if (targetSet.has("appointmentId")) {
    return new AppError({
      code: "CONFLICT_ERROR",
      message: error.message,
      userMessage: "A visit already exists for this appointment.",
      details: {
        prismaCode: error.code,
        target
      },
      cause: error
    });
  }

  return new AppError({
    code: "CONFLICT_ERROR",
    message: error.message,
    userMessage: "This record already exists.",
    details: {
      prismaCode: error.code,
      target
    },
    cause: error
  });
}

export function fromPrismaError(error: Prisma.PrismaClientKnownRequestError) {
  if (error.code === "P2002") {
    return mapPrismaUniqueConstraint(error);
  }

  if (error.code === "P2025") {
    return new AppError({
      code: "NOT_FOUND_ERROR",
      message: error.message,
      userMessage: "The requested record could not be found.",
      details: {
        prismaCode: error.code
      },
      cause: error
    });
  }

  if (error.code === "P2003") {
    return new AppError({
      code: "VALIDATION_ERROR",
      message: error.message,
      userMessage: "One of the selected records is invalid or no longer available.",
      details: {
        prismaCode: error.code,
        fieldName: error.meta?.field_name
      },
      cause: error
    });
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    message: error.message,
    userMessage: DEFAULT_MESSAGES.INTERNAL_ERROR,
    details: {
      prismaCode: error.code
    },
    cause: error
  });
}

function mapQrError(error: QrFlowError) {
  const qrCodeMap: Record<QrErrorCode, { code: AppErrorCode; status: number }> = {
    QR_INVALID: { code: "NOT_FOUND_ERROR", status: 404 },
    QR_REVOKED: { code: "BUSINESS_RULE_ERROR", status: 410 },
    QR_EXPIRED: { code: "BUSINESS_RULE_ERROR", status: 410 },
    QR_UNAUTHORIZED: { code: "AUTHORIZATION_ERROR", status: 403 },
    QR_RATE_LIMITED: { code: "RATE_LIMIT_ERROR", status: 429 },
    WORKFLOW_CONTEXT_BUILD_FAILED: { code: "INTERNAL_ERROR", status: 500 },
    PATIENT_SCOPE_DENIED: { code: "AUTHORIZATION_ERROR", status: 403 },
    APPOINTMENT_SCOPE_DENIED: { code: "AUTHORIZATION_ERROR", status: 403 },
    VISIT_SCOPE_DENIED: { code: "AUTHORIZATION_ERROR", status: 403 },
    STAFF_SESSION_REQUIRED: { code: "AUTHENTICATION_ERROR", status: 401 },
    ROLE_DESTINATION_FAILED: { code: "INTERNAL_ERROR", status: 500 }
  };
  const mapped = qrCodeMap[error.code];

  return new AppError({
    code: mapped.code,
    status: mapped.status,
    message: error.message,
    userMessage: error.message,
    details: {
      qrCode: error.code,
      workspaceId: error.workspaceId,
      workspaceSlug: error.workspaceSlug,
      patientId: error.patientId,
      actorUserId: error.actorUserId,
      actorRole: error.actorRole,
      causeMessage: error.causeMessage
    },
    cause: error
  });
}

function looksLikeMalformedJson(error: SyntaxError) {
  return /json/i.test(error.message) || /unexpected token/i.test(error.message);
}

export function normalizeAppError(error: unknown, fallbackMessage?: string): AppError {
  rethrowIfFrameworkControlFlow(error);

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return fromZodError(error, fallbackMessage);
  }

  if (error instanceof QrFlowError) {
    return mapQrError(error);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return fromPrismaError(error);
  }

  if (error instanceof SyntaxError && looksLikeMalformedJson(error)) {
    return new AppError({
      code: "VALIDATION_ERROR",
      message: error.message,
      userMessage: "The request body is not valid JSON.",
      cause: error
    });
  }

  if (error instanceof Error && error.message === "RATE_LIMITED") {
    return new AppError({
      code: "RATE_LIMIT_ERROR",
      message: error.message,
      userMessage: DEFAULT_MESSAGES.RATE_LIMIT_ERROR,
      cause: error
    });
  }

  if (error instanceof Error) {
    return new AppError({
      code: "INTERNAL_ERROR",
      message: error.message,
      userMessage: fallbackMessage ?? DEFAULT_MESSAGES.INTERNAL_ERROR,
      cause: error
    });
  }

  return new AppError({
    code: "INTERNAL_ERROR",
    message: "Unknown application error",
    userMessage: fallbackMessage ?? DEFAULT_MESSAGES.INTERNAL_ERROR,
    cause: error
  });
}

export function toApiErrorShape(error: unknown, fallbackMessage?: string): ApiErrorShape {
  const appError = normalizeAppError(error, fallbackMessage);

  return {
    code: appError.code,
    message: appError.userMessage,
    ...(appError.fieldErrors ? { fieldErrors: appError.fieldErrors } : {})
  };
}

export function logAppError(error: unknown, context: Record<string, unknown>) {
  const appError = normalizeAppError(error);

  console.error("[app-error]", {
    ...context,
    code: appError.code,
    status: appError.status,
    message: appError.message,
    userMessage: appError.userMessage,
    fieldErrors: appError.fieldErrors,
    details: appError.details,
    cause: appError.cause instanceof Error ? appError.cause.message : appError.cause
  });

  return appError;
}

export function buildErrorRedirectUrl(
  path: string,
  error: unknown,
  options?: {
    fallbackMessage?: string;
    searchParams?: Record<string, string | null | undefined>;
  }
) {
  const appError = normalizeAppError(error, options?.fallbackMessage);
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(options?.searchParams ?? {})) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  searchParams.set("error", appError.userMessage);
  searchParams.set("errorCode", appError.code);

  return `${path}?${searchParams.toString()}`;
}

