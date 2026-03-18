import { type QrIdentifierType, type Role } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { enforceSimpleRateLimit } from "@/lib/security/rate-limit";
import { PATIENT_PORTAL_ROLE } from "@/lib/security/patient-portal";
import {
  buildActivePatientContext,
  type ActivePatientContext,
  type WorkflowIntent,
  type WorkflowQuickAction
} from "@/features/workflow/service";

export type QrScanIntent = WorkflowIntent;
export type PatientScanQuickAction = WorkflowQuickAction;
export type PatientScanContext = ActivePatientContext;

export type ResolvePatientQrResult =
  | { kind: "login_required"; redirectTo: string }
  | { kind: "patient"; redirectTo: string }
  | { kind: "staff"; redirectTo: string; context: PatientScanContext };

type ScanActor =
  | { kind: "patient"; userId: string; workspaceId: string; patientId: string }
  | { kind: "staff"; userId: string; role: Role; workspaceId: string };

async function getScanActor(userId: string, workspaceId: string, patientId: string): Promise<ScanActor | null> {
  const [portalAccount, membership, superAdminMembership] = await Promise.all([
    db.patientPortalAccount.findFirst({
      where: {
        userId,
        workspaceId,
        patientId,
        portalEnabled: true
      }
    }),
    db.membership.findFirst({
      where: {
        userId,
        workspaceId,
        status: "ACTIVE"
      }
    }),
    db.membership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        role: "SUPER_ADMIN"
      }
    })
  ]);

  if (portalAccount) {
    return { kind: "patient", userId, workspaceId, patientId };
  }

  if (membership) {
    return { kind: "staff", userId, role: membership.role, workspaceId };
  }

  if (superAdminMembership) {
    return { kind: "staff", userId, role: "SUPER_ADMIN", workspaceId };
  }

  return null;
}

async function recordQrLog(params: {
  workspaceId: string;
  patientId?: string | null;
  qrIdentifierId?: string | null;
  scannerUserId?: string | null;
  scannerRole: string;
  qrType: QrIdentifierType;
  scanContext: string;
  status: "SUCCESS" | "INVALID" | "EXPIRED" | "REVOKED" | "UNAUTHORIZED" | "RATE_LIMITED";
  destination?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  metadataJson?: Record<string, unknown>;
}) {
  return db.qrScanLog.create({
    data: {
      workspaceId: params.workspaceId,
      patientId: params.patientId ?? null,
      qrIdentifierId: params.qrIdentifierId ?? null,
      scannerUserId: params.scannerUserId ?? null,
      scannerRole: params.scannerRole,
      qrType: params.qrType,
      scanContext: params.scanContext,
      status: params.status,
      destination: params.destination ?? null,
      ipAddress: params.ipAddress ?? null,
      deviceInfo: params.deviceInfo ?? null,
      metadataJson: params.metadataJson as never
    }
  });
}

export async function buildPatientScanContext(params: {
  workspaceId: string;
  patientId: string;
  role: Role;
  userId: string;
  intent?: QrScanIntent;
}) {
  return buildActivePatientContext({
    workspaceId: params.workspaceId,
    patientId: params.patientId,
    role: params.role,
    userId: params.userId,
    resolvedFrom: "qr",
    intent: params.intent
  });
}

export function getPatientScanDestination(_role: Role, context: PatientScanContext) {
  return context.recommendedNextRoute;
}

export async function resolvePatientQrScan(params: {
  publicId: string;
  userId?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
  intent?: QrScanIntent;
}): Promise<ResolvePatientQrResult> {
  enforceSimpleRateLimit(`qr:${params.ipAddress ?? "anon"}:${params.publicId}`, 20, 60_000);

  const qr = await db.patientQrIdentifier.findFirst({
    where: { publicId: params.publicId },
    include: {
      patient: {
        include: {
          workspace: true,
          portalAccount: true
        }
      }
    }
  });

  if (!qr) {
    throw new Error("QR_INVALID");
  }

  if (qr.revokedAt) {
    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId ?? null,
      scannerRole: "UNKNOWN",
      qrType: qr.qrType,
      scanContext: "resolve-api",
      status: "REVOKED",
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo
    });
    throw new Error("QR_REVOKED");
  }

  if (qr.expiresAt && qr.expiresAt < new Date()) {
    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId ?? null,
      scannerRole: "UNKNOWN",
      qrType: qr.qrType,
      scanContext: "resolve-api",
      status: "EXPIRED",
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo
    });
    throw new Error("QR_EXPIRED");
  }

  if (!params.userId) {
    const portalActivated = Boolean(qr.patient.portalAccount?.activatedAt) || qr.patient.adminState === "PORTAL_ACTIVE";
    const callbackUrl = encodeURIComponent(`/scan/${params.publicId}`);
    const activationQuery = portalActivated ? "" : "&activation=required";

    return {
      redirectTo: `/portal/login?callbackUrl=${callbackUrl}${activationQuery}`,
      kind: "login_required"
    };
  }

  const actor = await getScanActor(params.userId, qr.workspaceId, qr.patientId);

  if (!actor) {
    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId,
      scannerRole: "UNKNOWN",
      qrType: qr.qrType,
      scanContext: "resolve-api",
      status: "UNAUTHORIZED",
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo
    });
    throw new Error("QR_UNAUTHORIZED");
  }

  await db.patientQrIdentifier.update({
    where: { id: qr.id },
    data: { lastUsedAt: new Date() }
  });

  if (actor.kind === "patient") {
    const redirectTo = `/portal/check-in?qr=${params.publicId}`;

    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId,
      scannerRole: PATIENT_PORTAL_ROLE,
      qrType: qr.qrType,
      scanContext: "resolve-api",
      status: "SUCCESS",
      destination: redirectTo,
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo,
      metadataJson: {
        workflow: "patient-self-check-in"
      }
    });

    return {
      redirectTo,
      kind: "patient"
    };
  }

  if (actor.role === "SUPER_ADMIN") {
    const redirectTo = `/admin/support?patientId=${qr.patientId}&scan=qr`;

    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId,
      scannerRole: actor.role,
      qrType: qr.qrType,
      scanContext: "resolve-api",
      status: "SUCCESS",
      destination: redirectTo,
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo,
      metadataJson: {
        workflow: "support"
      }
    });

    return {
      redirectTo,
      kind: "staff",
      context: {
        patientId: qr.patientId,
        workspaceId: qr.workspaceId,
        workspaceSlug: qr.patient.workspace.slug,
        role: actor.role,
        resolvedFrom: "qr",
        intent: params.intent ?? "default",
        timestamp: new Date().toISOString(),
        currentWorkflowState: qr.patient.adminState,
        patient: {
          id: qr.patient.id,
          fullName: qr.patient.fullName,
          patientCode: qr.patient.patientCode,
          phone: qr.patient.phone,
          email: qr.patient.email,
          dob: qr.patient.dob,
          adminState: qr.patient.adminState,
          portalEnabled: qr.patient.portalEnabled
        },
        activeAppointmentId: null,
        activeVisitId: null,
        activeLabOrderId: null,
        recommendedNextRoute: {
          surface: "support",
          label: "Open support context",
          description: "Use support tooling and scan logs.",
          href: redirectTo
        },
        recommendedQuickActions: [],
        blockers: [],
        activeAppointment: null,
        recentAppointments: [],
        activeVisit: null,
        previousVisits: [],
        labOrders: [],
        recentReports: [],
        followUpTasks: []
      }
    };
  }

  let context: PatientScanContext;

  try {
    context = await buildActivePatientContext({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      role: actor.role,
      userId: actor.userId,
      resolvedFrom: "qr",
      intent: params.intent
    });
  } catch (error) {
    await recordQrLog({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      qrIdentifierId: qr.id,
      scannerUserId: params.userId,
      scannerRole: actor.role,
      qrType: qr.qrType,
      scanContext: "resolve-api",
      status: "UNAUTHORIZED",
      ipAddress: params.ipAddress,
      deviceInfo: params.deviceInfo,
      metadataJson: {
        reason: error instanceof Error ? error.message : "QR_UNAUTHORIZED"
      }
    });
    throw new Error("QR_UNAUTHORIZED");
  }

  const redirectTo = `${context.recommendedNextRoute.href}?resolvedFrom=qr`;

  await recordQrLog({
    workspaceId: qr.workspaceId,
    patientId: qr.patientId,
    qrIdentifierId: qr.id,
    scannerUserId: params.userId,
    scannerRole: actor.role,
    qrType: qr.qrType,
    scanContext: "resolve-api",
    status: "SUCCESS",
    destination: redirectTo,
    ipAddress: params.ipAddress,
    deviceInfo: params.deviceInfo,
    metadataJson: {
      workflow: context.recommendedNextRoute.surface,
      intent: context.intent,
      activeAppointmentId: context.activeAppointmentId,
      activeVisitId: context.activeVisitId,
      activeLabOrderId: context.activeLabOrderId,
      currentWorkflowState: context.currentWorkflowState
    }
  });

  return {
    redirectTo,
    kind: "staff",
    context
  };
}
