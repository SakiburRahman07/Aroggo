export const PATIENT_PORTAL_ROLE = "PATIENT" as const;
export type PatientPortalRole = typeof PATIENT_PORTAL_ROLE;

export const patientPortalNavigation = [
  "/portal/profile",
  "/portal/appointments",
  "/portal/documents",
  "/portal/notifications",
  "/portal/qr",
  "/portal/check-in"
] as const;
