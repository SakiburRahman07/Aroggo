import { type AppointmentStatus, type DocumentProcessingStatus, type Role, type TaskPriority, type TaskStatus } from "@prisma/client";

export type Permission =
  | "workspace:manage"
  | "members:manage"
  | "patients:read"
  | "patients:write"
  | "appointments:read"
  | "appointments:write"
  | "visits:read"
  | "visits:write"
  | "documents:read"
  | "documents:write"
  | "tasks:read"
  | "tasks:write"
  | "analytics:read"
  | "notifications:read"
  | "ai:use";

const allPermissions: Permission[] = [
  "workspace:manage",
  "members:manage",
  "patients:read",
  "patients:write",
  "appointments:read",
  "appointments:write",
  "visits:read",
  "visits:write",
  "documents:read",
  "documents:write",
  "tasks:read",
  "tasks:write",
  "analytics:read",
  "notifications:read",
  "ai:use"
];

const rolePermissions: Record<Role, Permission[]> = {
  SUPER_ADMIN: allPermissions,
  CLINIC_ADMIN: allPermissions,
  DOCTOR: [
    "patients:read",
    "patients:write",
    "appointments:read",
    "visits:read",
    "visits:write",
    "documents:read",
    "tasks:read",
    "tasks:write",
    "analytics:read",
    "notifications:read",
    "ai:use"
  ],
  RECEPTIONIST: [
    "patients:read",
    "patients:write",
    "appointments:read",
    "appointments:write",
    "tasks:read",
    "tasks:write",
    "notifications:read"
  ],
  LAB_STAFF: [
    "patients:read",
    "documents:read",
    "documents:write",
    "tasks:read",
    "notifications:read",
    "ai:use"
  ],
  OPERATIONS_MANAGER: [
    "patients:read",
    "appointments:read",
    "documents:read",
    "tasks:read",
    "tasks:write",
    "analytics:read",
    "members:manage",
    "notifications:read",
    "ai:use"
  ]
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
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

