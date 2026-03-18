import type { PatientAdminState, PatientFlowState } from "@prisma/client";

export const workflowStateLabels: Record<PatientFlowState | PatientAdminState, string> = {
  NEW: "New",
  REGISTERED: "Registered",
  PORTAL_INVITED: "Portal invited",
  PORTAL_ACTIVE: "Portal active",
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  ARRIVED: "Arrived",
  READY_FOR_PROVIDER: "Ready for provider",
  IN_CONSULTATION: "In consultation",
  SENT_TO_LAB: "Sent to lab",
  WAITING_FOR_RESULT: "Waiting for result",
  REVIEWED: "Reviewed",
  CHECKED_OUT: "Checked out",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show"
};

export function workflowStateVariant(state: PatientFlowState | PatientAdminState) {
  if (["ARRIVED", "READY_FOR_PROVIDER", "IN_CONSULTATION", "PORTAL_ACTIVE"].includes(state)) {
    return "success" as const;
  }

  if (["WAITING_FOR_RESULT", "SENT_TO_LAB", "PORTAL_INVITED"].includes(state)) {
    return "warning" as const;
  }

  if (["CANCELLED", "NO_SHOW"].includes(state)) {
    return "destructive" as const;
  }

  return "outline" as const;
}
