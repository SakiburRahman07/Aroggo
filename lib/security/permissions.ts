import { type AppointmentStatus, type DocumentProcessingStatus, type Role, type TaskPriority, type TaskStatus } from "@prisma/client";

export const permissionList = [
  "platform:access",
  "platform:manage",
  "workspace:manage",
  "settings:manage",
  "members:read",
  "members:manage",
  "patients:read_basic",
  "patients:read_basic_limited",
  "patients:read_clinical",
  "patients:write_basic",
  "appointments:read",
  "appointments:read_own",
  "appointments:write",
  "visits:read",
  "visits:write",
  "documents:read_clinical",
  "documents:read_lab",
  "documents:read_ops_limited",
  "documents:write_clinical",
  "documents:write_lab",
  "tasks:read",
  "tasks:read_own",
  "tasks:read_frontdesk",
  "tasks:read_lab",
  "tasks:write",
  "tasks:write_relevant",
  "tasks:write_frontdesk",
  "tasks:write_lab",
  "analytics:read_operational",
  "analytics:read_clinical",
  "notifications:read",
  "reports:upload",
  "reports:verify",
  "reminders:send",
  "audit:read",
  "ai:use_general",
  "ai:use_clinical",
  "ai:use_lab",
  "ai:use_ops"
] as const;

export type Permission = (typeof permissionList)[number];
export type PermissionRequest = Permission | readonly Permission[];

const allPermissions = [...permissionList] satisfies Permission[];

export const rolePermissions: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: allPermissions,
  CLINIC_ADMIN: [
    "workspace:manage",
    "settings:manage",
    "members:read",
    "members:manage",
    "patients:read_basic",
    "patients:read_clinical",
    "patients:write_basic",
    "appointments:read",
    "appointments:write",
    "visits:read",
    "visits:write",
    "documents:read_clinical",
    "documents:read_lab",
    "documents:read_ops_limited",
    "documents:write_clinical",
    "documents:write_lab",
    "tasks:read",
    "tasks:write",
    "analytics:read_operational",
    "analytics:read_clinical",
    "notifications:read",
    "reports:upload",
    "reports:verify",
    "reminders:send",
    "audit:read",
    "ai:use_general",
    "ai:use_clinical",
    "ai:use_lab",
    "ai:use_ops"
  ],
  DOCTOR: [
    "patients:read_basic",
    "patients:read_clinical",
    "appointments:read_own",
    "visits:read",
    "visits:write",
    "documents:read_clinical",
    "documents:read_lab",
    "tasks:read_own",
    "tasks:write_relevant",
    "notifications:read",
    "ai:use_general",
    "ai:use_clinical"
  ],
  RECEPTIONIST: [
    "patients:read_basic",
    "patients:write_basic",
    "appointments:read",
    "appointments:write",
    "tasks:read_frontdesk",
    "tasks:write_frontdesk",
    "notifications:read",
    "reminders:send"
  ],
  LAB_STAFF: [
    "patients:read_basic",
    "documents:read_lab",
    "documents:write_lab",
    "tasks:read_lab",
    "tasks:write_lab",
    "notifications:read",
    "reports:upload",
    "reports:verify",
    "ai:use_general",
    "ai:use_lab"
  ],
  OPERATIONS_MANAGER: [
    "members:read",
    "patients:read_basic_limited",
    "appointments:read",
    "documents:read_ops_limited",
    "tasks:read",
    "tasks:write",
    "analytics:read_operational",
    "notifications:read",
    "ai:use_ops"
  ]
};

export const patientReadPermissions = [
  "patients:read_basic",
  "patients:read_basic_limited",
  "patients:read_clinical"
] as const satisfies readonly Permission[];

export const appointmentReadPermissions = ["appointments:read", "appointments:read_own"] as const satisfies readonly Permission[];
export const documentReadPermissions = [
  "documents:read_clinical",
  "documents:read_lab",
  "documents:read_ops_limited"
] as const satisfies readonly Permission[];
export const taskReadPermissions = ["tasks:read", "tasks:read_own", "tasks:read_frontdesk", "tasks:read_lab"] as const satisfies readonly Permission[];
export const taskWritePermissions = ["tasks:write", "tasks:write_relevant", "tasks:write_frontdesk", "tasks:write_lab"] as const satisfies readonly Permission[];
export const analyticsReadPermissions = ["analytics:read_operational", "analytics:read_clinical"] as const satisfies readonly Permission[];
export const aiUsePermissions = ["ai:use_general", "ai:use_clinical", "ai:use_lab", "ai:use_ops"] as const satisfies readonly Permission[];

export function getRolePermissions(role: Role) {
  return rolePermissions[role];
}

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function hasAnyPermission(role: Role, permissions: readonly Permission[]) {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasRequestedPermission(role: Role, request?: PermissionRequest) {
  if (!request) {
    return true;
  }

  if (Array.isArray(request)) {
    return hasAnyPermission(role, request);
  }

  return hasPermission(role, request as Permission);
}

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  CLINIC_ADMIN: "Clinic Admin",
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
  LAB_STAFF: "Lab Staff",
  OPERATIONS_MANAGER: "Operations Manager"
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
  CANCELED: "Canceled"
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent"
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked in",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show"
};

export const documentStatusLabels: Record<DocumentProcessingStatus, string> = {
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed"
};