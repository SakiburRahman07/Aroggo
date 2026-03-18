export type QrErrorCode =
  | "QR_INVALID"
  | "QR_REVOKED"
  | "QR_EXPIRED"
  | "QR_UNAUTHORIZED"
  | "QR_RATE_LIMITED"
  | "WORKFLOW_CONTEXT_BUILD_FAILED"
  | "PATIENT_SCOPE_DENIED"
  | "APPOINTMENT_SCOPE_DENIED"
  | "VISIT_SCOPE_DENIED"
  | "STAFF_SESSION_REQUIRED"
  | "ROLE_DESTINATION_FAILED";

export class QrFlowError extends Error {
  code: QrErrorCode;
  workspaceId?: string;
  workspaceSlug?: string;
  patientId?: string;
  actorUserId?: string;
  actorRole?: string;
  causeMessage?: string;

  constructor(code: QrErrorCode, message?: string, metadata?: Partial<QrFlowError>) {
    super(message ?? code);
    this.name = "QrFlowError";
    this.code = code;
    Object.assign(this, metadata);
  }
}

export function isQrFlowError(error: unknown): error is QrFlowError {
  return error instanceof QrFlowError;
}

export function getQrFlowError(error: unknown) {
  if (isQrFlowError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new QrFlowError("WORKFLOW_CONTEXT_BUILD_FAILED", error.message, {
      causeMessage: error.message
    });
  }

  return new QrFlowError("WORKFLOW_CONTEXT_BUILD_FAILED", "Unknown QR workflow error");
}

export function getScanErrorQueryValue(code: QrErrorCode) {
  switch (code) {
    case "QR_INVALID":
      return "invalid";
    case "QR_REVOKED":
      return "revoked";
    case "QR_EXPIRED":
      return "expired";
    case "QR_UNAUTHORIZED":
    case "PATIENT_SCOPE_DENIED":
    case "APPOINTMENT_SCOPE_DENIED":
    case "VISIT_SCOPE_DENIED":
      return "unauthorized";
    case "STAFF_SESSION_REQUIRED":
      return "session";
    case "ROLE_DESTINATION_FAILED":
    case "WORKFLOW_CONTEXT_BUILD_FAILED":
    default:
      return "workflow";
  }
}
