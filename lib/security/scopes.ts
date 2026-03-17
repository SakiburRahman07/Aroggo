import { type DocumentType, Prisma, type Role } from "@prisma/client";
import { hasPermission } from "@/lib/security/permissions";

export interface ViewerContext {
  role: Role;
  userId: string;
}

export interface PatientAccessScope {
  readBasic: boolean;
  readClinical: boolean;
  canWriteBasic: boolean;
  visibility: "workspace" | "doctor_panel";
}

export interface AppointmentAccessScope {
  readAll: boolean;
  readOwn: boolean;
  canWrite: boolean;
  visibility: "workspace" | "own";
}

export interface VisitAccessScope {
  read: boolean;
  write: boolean;
  visibility: "workspace" | "own";
}

export interface DocumentAccessScope {
  readClinical: boolean;
  readLab: boolean;
  readOpsLimited: boolean;
  canUpload: boolean;
  canVerify: boolean;
  showRawText: boolean;
  showStructuredExtraction: boolean;
  allowedTypes: DocumentType[] | null;
  visibility: "workspace" | "doctor_panel" | "workspace_ops";
}

export interface TaskAccessScope {
  canRead: boolean;
  canWrite: boolean;
  visibility: "workspace" | "own" | "frontdesk" | "lab";
}

export interface AnalyticsAccessScope {
  readOperational: boolean;
  readClinical: boolean;
}

const labDocumentTypes: DocumentType[] = ["LAB_REPORT", "IMAGING"];
const doctorDocumentTypes: DocumentType[] = ["LAB_REPORT", "PRESCRIPTION", "IMAGING", "CONSENT", "INTERNAL_NOTE", "SOP", "OTHER"];
const operationsDocumentTypes: DocumentType[] = ["INTERNAL_NOTE", "SOP", "OTHER"];

export function getScopedPatientAccess(role: Role): PatientAccessScope {
  return {
    readBasic: hasPermission(role, "patients:read_basic") || hasPermission(role, "patients:read_basic_limited") || hasPermission(role, "patients:read_clinical"),
    readClinical: hasPermission(role, "patients:read_clinical"),
    canWriteBasic: hasPermission(role, "patients:write_basic"),
    visibility: role === "DOCTOR" ? "doctor_panel" : "workspace"
  };
}

export function getScopedAppointmentAccess(role: Role): AppointmentAccessScope {
  const readAll = hasPermission(role, "appointments:read");
  const readOwn = hasPermission(role, "appointments:read_own");

  return {
    readAll,
    readOwn,
    canWrite: hasPermission(role, "appointments:write"),
    visibility: readAll ? "workspace" : "own"
  };
}

export function getScopedVisitAccess(role: Role): VisitAccessScope {
  return {
    read: hasPermission(role, "visits:read"),
    write: hasPermission(role, "visits:write"),
    visibility: role === "DOCTOR" ? "own" : "workspace"
  };
}

export function getScopedDocumentAccess(role: Role): DocumentAccessScope {
  if (role === "SUPER_ADMIN" || role === "CLINIC_ADMIN") {
    return {
      readClinical: true,
      readLab: true,
      readOpsLimited: true,
      canUpload: true,
      canVerify: true,
      showRawText: true,
      showStructuredExtraction: true,
      allowedTypes: null,
      visibility: "workspace"
    };
  }

  if (role === "DOCTOR") {
    return {
      readClinical: true,
      readLab: true,
      readOpsLimited: false,
      canUpload: false,
      canVerify: false,
      showRawText: true,
      showStructuredExtraction: true,
      allowedTypes: doctorDocumentTypes,
      visibility: "doctor_panel"
    };
  }

  if (role === "LAB_STAFF") {
    return {
      readClinical: false,
      readLab: true,
      readOpsLimited: false,
      canUpload: true,
      canVerify: true,
      showRawText: true,
      showStructuredExtraction: true,
      allowedTypes: labDocumentTypes,
      visibility: "workspace"
    };
  }

  if (role === "OPERATIONS_MANAGER") {
    return {
      readClinical: false,
      readLab: false,
      readOpsLimited: true,
      canUpload: false,
      canVerify: false,
      showRawText: false,
      showStructuredExtraction: false,
      allowedTypes: operationsDocumentTypes,
      visibility: "workspace_ops"
    };
  }

  return {
    readClinical: false,
    readLab: false,
    readOpsLimited: false,
    canUpload: false,
    canVerify: false,
    showRawText: false,
    showStructuredExtraction: false,
    allowedTypes: [],
    visibility: "workspace"
  };
}

export function getScopedTaskAccess(role: Role): TaskAccessScope {
  if (role === "SUPER_ADMIN" || role === "CLINIC_ADMIN" || role === "OPERATIONS_MANAGER") {
    return {
      canRead: true,
      canWrite: true,
      visibility: "workspace"
    };
  }

  if (role === "DOCTOR") {
    return {
      canRead: true,
      canWrite: true,
      visibility: "own"
    };
  }

  if (role === "RECEPTIONIST") {
    return {
      canRead: true,
      canWrite: true,
      visibility: "frontdesk"
    };
  }

  if (role === "LAB_STAFF") {
    return {
      canRead: true,
      canWrite: true,
      visibility: "lab"
    };
  }

  return {
    canRead: false,
    canWrite: false,
    visibility: "own"
  };
}

export function getScopedAnalyticsAccess(role: Role): AnalyticsAccessScope {
  return {
    readOperational: hasPermission(role, "analytics:read_operational"),
    readClinical: hasPermission(role, "analytics:read_clinical")
  };
}

export function getScopedDocumentTypes(role: Role) {
  return getScopedDocumentAccess(role).allowedTypes;
}

export function canUploadDocumentType(role: Role, docType: DocumentType) {
  if (role === "SUPER_ADMIN" || role === "CLINIC_ADMIN") {
    return true;
  }

  if (role === "LAB_STAFF") {
    return labDocumentTypes.includes(docType);
  }

  return false;
}

export function buildPatientVisibilityWhere(workspaceId: string, viewer: ViewerContext, search?: string): Prisma.PatientWhereInput {
  const filters: Prisma.PatientWhereInput[] = [{ workspaceId }];

  if (viewer.role === "DOCTOR") {
    filters.push({
      OR: [
        { appointments: { some: { doctorUserId: viewer.userId } } },
        { visits: { some: { doctorUserId: viewer.userId } } }
      ]
    });
  }

  if (search) {
    filters.push({
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { patientCode: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } }
      ]
    });
  }

  return { AND: filters };
}

export function buildAppointmentVisibilityWhere(workspaceId: string, viewer: ViewerContext): Prisma.AppointmentWhereInput {
  const filters: Prisma.AppointmentWhereInput[] = [{ workspaceId }];

  if (viewer.role === "DOCTOR") {
    filters.push({ doctorUserId: viewer.userId });
  }

  return { AND: filters };
}

export function buildVisitVisibilityWhere(workspaceId: string, viewer: ViewerContext): Prisma.VisitWhereInput {
  const filters: Prisma.VisitWhereInput[] = [{ workspaceId }];

  if (viewer.role === "DOCTOR") {
    filters.push({ doctorUserId: viewer.userId });
  }

  return { AND: filters };
}

export function buildDocumentVisibilityWhere(workspaceId: string, viewer: ViewerContext, patientId?: string): Prisma.DocumentWhereInput {
  const filters: Prisma.DocumentWhereInput[] = [{ workspaceId }];
  const documentAccess = getScopedDocumentAccess(viewer.role);

  if (patientId) {
    filters.push({ patientId });
  }

  if (documentAccess.allowedTypes && documentAccess.allowedTypes.length > 0) {
    filters.push({ docType: { in: documentAccess.allowedTypes } });
  }

  if (viewer.role === "DOCTOR") {
    filters.push({
      OR: [
        { patient: { appointments: { some: { doctorUserId: viewer.userId } } } },
        { patient: { visits: { some: { doctorUserId: viewer.userId } } } },
        { patientId: null, docType: { in: ["SOP", "INTERNAL_NOTE"] } }
      ]
    });
  }

  if (viewer.role === "OPERATIONS_MANAGER") {
    filters.push({ patientId: null });
  }

  return { AND: filters };
}

export function buildTaskVisibilityWhere(workspaceId: string, viewer: ViewerContext): Prisma.TaskWhereInput {
  const filters: Prisma.TaskWhereInput[] = [{ workspaceId }];

  if (viewer.role === "DOCTOR") {
    filters.push({
      OR: [
        { assigneeUserId: viewer.userId },
        { createdById: viewer.userId },
        { appointment: { is: { doctorUserId: viewer.userId } } },
        { patient: { is: { visits: { some: { doctorUserId: viewer.userId } } } } }
      ]
    });
  }

  if (viewer.role === "RECEPTIONIST") {
    filters.push({
      OR: [
        { assigneeUserId: viewer.userId },
        { createdById: viewer.userId },
        { assigneeUserId: null, appointmentId: { not: null } }
      ]
    });
  }

  if (viewer.role === "LAB_STAFF") {
    filters.push({
      OR: [
        { assigneeUserId: viewer.userId },
        { createdById: viewer.userId }
      ]
    });
  }

  return { AND: filters };
}