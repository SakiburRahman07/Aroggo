import { type Role } from "@prisma/client";
import { hasRequestedPermission, type Permission } from "@/lib/security/permissions";

export type NavIconKey =
  | "dashboard"
  | "patients"
  | "appointments"
  | "documents"
  | "tasks"
  | "analytics"
  | "notifications"
  | "team"
  | "settings"
  | "ai"
  | "visits"
  | "workspace"
  | "users"
  | "usage"
  | "email"
  | "logs"
  | "support";

interface WorkspaceNavigationItemConfig {
  label: string;
  segment: string;
  icon: NavIconKey;
  permissions?: readonly Permission[];
}

interface PlatformNavigationItem {
  label: string;
  href: string;
  icon: NavIconKey;
}

const dashboardSegments: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  CLINIC_ADMIN: "/overview",
  DOCTOR: "/doctor",
  RECEPTIONIST: "/front-desk",
  LAB_STAFF: "/lab",
  OPERATIONS_MANAGER: "/operations"
};

const workspaceNavigation: Record<Exclude<Role, "SUPER_ADMIN">, readonly WorkspaceNavigationItemConfig[]> = {
  CLINIC_ADMIN: [
    { label: "Overview", segment: "/overview", icon: "dashboard" },
    { label: "Patients", segment: "/patients", icon: "patients" },
    { label: "Appointments", segment: "/appointments", icon: "appointments" },
    { label: "Documents", segment: "/documents", icon: "documents" },
    { label: "Tasks", segment: "/tasks", icon: "tasks" },
    { label: "AI Assistant", segment: "/ai-assistant", icon: "ai" },
    { label: "Analytics", segment: "/analytics", icon: "analytics" },
    { label: "Notifications", segment: "/notifications", icon: "notifications" },
    { label: "Team", segment: "/team", icon: "team" },
    { label: "Settings", segment: "/settings", icon: "settings" }
  ],
  DOCTOR: [
    { label: "Doctor Home", segment: "/doctor", icon: "dashboard" },
    { label: "My Patients", segment: "/patients", icon: "patients" },
    { label: "My Schedule", segment: "/appointments", icon: "appointments" },
    { label: "Visits", segment: "/visits", icon: "visits" },
    { label: "Documents", segment: "/documents", icon: "documents" },
    { label: "Tasks", segment: "/tasks", icon: "tasks" },
    { label: "AI Assistant", segment: "/ai-assistant", icon: "ai" },
    { label: "Notifications", segment: "/notifications", icon: "notifications" }
  ],
  RECEPTIONIST: [
    { label: "Front Desk", segment: "/front-desk", icon: "dashboard" },
    { label: "Patients", segment: "/patients", icon: "patients" },
    { label: "Appointments", segment: "/appointments", icon: "appointments" },
    { label: "Tasks", segment: "/tasks", icon: "tasks" },
    { label: "Notifications", segment: "/notifications", icon: "notifications" }
  ],
  LAB_STAFF: [
    { label: "Lab Dashboard", segment: "/lab", icon: "dashboard" },
    { label: "Reports", segment: "/documents", icon: "documents" },
    { label: "Tasks", segment: "/tasks", icon: "tasks" },
    { label: "Notifications", segment: "/notifications", icon: "notifications" }
  ],
  OPERATIONS_MANAGER: [
    { label: "Ops Dashboard", segment: "/operations", icon: "dashboard" },
    { label: "Appointments", segment: "/appointments", icon: "appointments" },
    { label: "Tasks", segment: "/tasks", icon: "tasks" },
    { label: "Analytics", segment: "/analytics", icon: "analytics" },
    { label: "Team Overview", segment: "/team", icon: "team" },
    { label: "Documents", segment: "/documents", icon: "documents" },
    { label: "Notifications", segment: "/notifications", icon: "notifications" },
    { label: "AI Ops Summary", segment: "/ai-assistant", icon: "ai" }
  ]
};

const platformNavigation: readonly PlatformNavigationItem[] = [
  { label: "Platform Overview", href: "/admin", icon: "dashboard" },
  { label: "Workspaces", href: "/admin/workspaces", icon: "workspace" },
  { label: "Users", href: "/admin/users", icon: "users" },
  { label: "Usage", href: "/admin/usage", icon: "usage" },
  { label: "Logs", href: "/admin/logs", icon: "logs" },
  { label: "Email", href: "/admin/email", icon: "email" },
  { label: "AI", href: "/admin/ai", icon: "ai" },
  { label: "Support", href: "/admin/support", icon: "support" }
];

export function getDefaultDashboardRoute(role: Role, workspaceSlug?: string) {
  const segment = dashboardSegments[role];

  if (role === "SUPER_ADMIN") {
    return segment;
  }

  if (!workspaceSlug) {
    return "/app";
  }

  return `/app/${workspaceSlug}${segment}`;
}

export function getRoleNavigation(role: Role, workspaceSlug: string) {
  if (role === "SUPER_ADMIN") {
    return [];
  }

  return workspaceNavigation[role]
    .filter((item) => !item.permissions || hasRequestedPermission(role, item.permissions))
    .map((item) => ({
      ...item,
      href: `/app/${workspaceSlug}${item.segment}`
    }));
}

export function getPlatformNavigation() {
  return [...platformNavigation];
}