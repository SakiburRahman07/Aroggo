import { endOfDay, startOfDay } from "date-fns";
import { type AppointmentStatus, type QrIdentifierType, type Role } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { buildAppointmentVisibilityWhere, buildDocumentVisibilityWhere, buildPatientVisibilityWhere, buildTaskVisibilityWhere, buildVisitVisibilityWhere, type ViewerContext } from "@/lib/security/scopes";
import { enforceSimpleRateLimit } from "@/lib/security/rate-limit";
import { PATIENT_PORTAL_ROLE } from "@/lib/security/patient-portal";

export type QrScanIntent = "default" | "check_in" | "visit" | "report_upload" | "patient_summary";

export type PatientScanQuickAction = {
  label: string;
  href: string;
  description: string;
  tone?: "primary" | "secondary" | "success";
};

export type PatientScanContext = {
  patientId: string;
  resolvedFrom: "qr";
  role: Role;
  workspaceId: string;
  workspaceSlug: string;
  timestamp: string;
  intent: QrScanIntent;
  patient: {
    id: string;
    fullName: string;
    patientCode: string;
    phone: string;
  };
  recommendedWorkflow: {
    label: string;
    description: string;
    href: string;
  };
  activeAppointmentId: string | null;
  activeVisitId: string | null;
  quickActions: PatientScanQuickAction[];
  todayAppointments: Array<{
    id: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    reason: string;
    doctorName: string;
    visitId: string | null;
  }>;
  recentReports: Array<{
    id: string;
    title: string;
    processingStatus: string;
    createdAt: Date;
  }>;
  roleRelevantTasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
};

export type ResolvePatientQrResult =
  | { kind: "login_required"; redirectTo: string }
  | { kind: "patient"; redirectTo: string }
  | { kind: "staff"; redirectTo: string; context: PatientScanContext };

type ScanActor =
  | { kind: "patient"; userId: string; workspaceId: string; patientId: string }
  | { kind: "staff"; userId: string; role: Role; workspaceId: string };

type BuildPatientScanContextParams = {
  workspaceId: string;
  patientId: string;
  role: Role;
  userId: string;
  intent?: QrScanIntent;
};

function getViewer(role: Role, userId: string): ViewerContext {
  return { role, userId };
}

function getScanContextRoute(workspaceSlug: string, patientId: string) {
  return `/app/${workspaceSlug}/scan/context/${patientId}?resolvedFrom=qr`;
}

function buildDocumentQueueHref(workspaceSlug: string, patientId: string) {
  return `/app/${workspaceSlug}/documents?patientId=${patientId}&scan=qr`;
}

function buildPatientSummaryHref(workspaceSlug: string, patientId: string, mode: string) {
  return `/app/${workspaceSlug}/patients/${patientId}?scan=${mode}`;
}

function getQuickActions(params: {
  role: Role;
  workspaceSlug: string;
  patientId: string;
  todayAppointmentId: string | null;
  activeVisitId: string | null;
  recentReportId: string | null;
}) {
  const visitHref = params.activeVisitId
    ? `/app/${params.workspaceSlug}/visits/${params.activeVisitId}?scan=doctor`
    : params.todayAppointmentId
      ? `/app/${params.workspaceSlug}/appointments/${params.todayAppointmentId}/open-visit?source=qr`
      : buildPatientSummaryHref(params.workspaceSlug, params.patientId, "clinical");

  switch (params.role) {
    case "DOCTOR":
      return [
        { label: "Write Prescription", href: visitHref, description: "Jump into the visit workspace and continue prescribing.", tone: "primary" as const },
        { label: "Start Visit Note", href: visitHref, description: "Open or create the active visit note for today.", tone: "success" as const },
        { label: "View History", href: buildPatientSummaryHref(params.workspaceSlug, params.patientId, "clinical"), description: "Review the full clinical summary and visit history." },
        { label: "Review Reports", href: buildDocumentQueueHref(params.workspaceSlug, params.patientId), description: "Inspect recent patient reports and linked documents." },
        { label: "Add Follow-up", href: visitHref, description: "Use the visit workflow to record follow-up instructions." }
      ];
    case "RECEPTIONIST":
      return [
        ...(params.todayAppointmentId ? [{ label: "Check In", href: `/app/${params.workspaceSlug}/appointments/${params.todayAppointmentId}?scan=front-desk`, description: "Open today's appointment and complete front-desk check-in.", tone: "primary" as const }] : []),
        { label: "Confirm Demographics", href: buildPatientSummaryHref(params.workspaceSlug, params.patientId, "front-desk"), description: "Verify patient basics and intake information." },
        ...(params.todayAppointmentId ? [{ label: "View Appointment", href: `/app/${params.workspaceSlug}/appointments/${params.todayAppointmentId}?scan=front-desk`, description: "Review schedule details and appointment state." }] : []),
        { label: "Reschedule", href: `/app/${params.workspaceSlug}/appointments/new?patientId=${params.patientId}&scan=front-desk`, description: "Book or adjust the patient's next appointment." },
        { label: "Send Reminder", href: buildPatientSummaryHref(params.workspaceSlug, params.patientId, "front-desk"), description: "Open the patient front-desk context for reminder follow-up." }
      ];
    case "LAB_STAFF":
      return [
        { label: "Upload Report", href: buildDocumentQueueHref(params.workspaceSlug, params.patientId), description: "Open the report workflow with this patient already selected.", tone: "primary" as const },
        { label: "Match Report", href: buildDocumentQueueHref(params.workspaceSlug, params.patientId), description: "Verify the patient-report match before processing." },
        ...(params.recentReportId ? [{ label: "Review Processing", href: `/app/${params.workspaceSlug}/documents/${params.recentReportId}?scan=lab`, description: "Inspect the latest linked report and processing status." }] : []),
        ...(params.recentReportId ? [{ label: "Mark Ready", href: `/app/${params.workspaceSlug}/documents/${params.recentReportId}?scan=lab`, description: "Continue with lab review on the most recent report." }] : [])
      ];
    case "OPERATIONS_MANAGER":
      return [
        { label: "Operational Overview", href: buildPatientSummaryHref(params.workspaceSlug, params.patientId, "operations"), description: "Stay within queue-safe patient context without clinical editing.", tone: "primary" as const },
        ...(params.todayAppointmentId ? [{ label: "View Queue Status", href: `/app/${params.workspaceSlug}/appointments/${params.todayAppointmentId}?scan=operations`, description: "Review today's operational appointment state." }] : [])
      ];
    case "CLINIC_ADMIN":
      return [
        { label: "Open Patient Profile", href: buildPatientSummaryHref(params.workspaceSlug, params.patientId, "admin"), description: "Open the full clinic-authorized patient profile.", tone: "primary" as const },
        ...(params.todayAppointmentId ? [{ label: "Open Appointment", href: `/app/${params.workspaceSlug}/appointments/${params.todayAppointmentId}?scan=admin`, description: "Review today's appointment and current workflow state." }] : []),
        { label: "Review Documents", href: buildDocumentQueueHref(params.workspaceSlug, params.patientId), description: "Open the patient-specific document workflow." }
      ];
    case "SUPER_ADMIN":
      return [
        { label: "Open Support View", href: `/admin/support?patientId=${params.patientId}&scan=qr`, description: "Use admin support tooling and scan logs for this patient.", tone: "primary" as const }
      ];
    default:
      return [];
  }
}

export function getPatientScanDestination(role: Role, context: PatientScanContext, intent: QrScanIntent = "default") {
  if (role === "DOCTOR") {
    if (context.activeVisitId) {
      return {
        label: "Continue visit workspace",
        description: "Open the patient's active clinical note and continue prescribing or documenting.",
        href: `/app/${context.workspaceSlug}/visits/${context.activeVisitId}?scan=doctor`
      };
    }

    if (context.activeAppointmentId) {
      return {
        label: "Start visit workflow",
        description: "Open today's appointment and continue directly into visit documentation.",
        href: `/app/${context.workspaceSlug}/appointments/${context.activeAppointmentId}/open-visit?source=qr`
      };
    }

    return {
      label: "Open clinical summary",
      description: "Review the patient's clinical context and history.",
      href: buildPatientSummaryHref(context.workspaceSlug, context.patientId, intent === "patient_summary" ? "summary" : "clinical")
    };
  }

  if (role === "RECEPTIONIST") {
    if (context.activeAppointmentId) {
      return {
        label: "Open check-in workflow",
        description: "Open today's appointment with front-desk actions ready.",
        href: `/app/${context.workspaceSlug}/appointments/${context.activeAppointmentId}?scan=front-desk`
      };
    }

    return {
      label: "Open front-desk patient view",
      description: "Continue with demographics, scheduling, and reminder actions.",
      href: buildPatientSummaryHref(context.workspaceSlug, context.patientId, "front-desk")
    };
  }

  if (role === "LAB_STAFF") {
    return {
      label: "Open report workflow",
      description: "Upload or review patient-linked reports in the lab queue.",
      href: buildDocumentQueueHref(context.workspaceSlug, context.patientId)
    };
  }

  if (role === "OPERATIONS_MANAGER") {
    return {
      label: "Open operational context",
      description: "Review queue state and workflow-safe patient operations context.",
      href: context.activeAppointmentId
        ? `/app/${context.workspaceSlug}/appointments/${context.activeAppointmentId}?scan=operations`
        : buildPatientSummaryHref(context.workspaceSlug, context.patientId, "operations")
    };
  }

  if (role === "CLINIC_ADMIN") {
    return {
      label: "Open full patient view",
      description: "Continue into the clinic-authorized patient workspace.",
      href: buildPatientSummaryHref(context.workspaceSlug, context.patientId, "admin")
    };
  }

  return {
    label: "Open support context",
    description: "Use the support/admin workflow for this scan.",
    href: `/admin/support?patientId=${context.patientId}&scan=qr`
  };
}

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

export async function buildPatientScanContext(params: BuildPatientScanContextParams): Promise<PatientScanContext> {
  const viewer = getViewer(params.role, params.userId);
  const [patient, todayAppointments, visits, recentReports, roleRelevantTasks, workspace] = await Promise.all([
    db.patient.findFirst({
      where: {
        AND: [buildPatientVisibilityWhere(params.workspaceId, viewer), { id: params.patientId }]
      },
      select: {
        id: true,
        fullName: true,
        patientCode: true,
        phone: true
      }
    }),
    db.appointment.findMany({
      where: {
        AND: [buildAppointmentVisibilityWhere(params.workspaceId, viewer), {
          patientId: params.patientId,
          scheduledAt: {
            gte: startOfDay(new Date()),
            lte: endOfDay(new Date())
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] satisfies AppointmentStatus[]
          }
        }]
      },
      include: {
        doctor: {
          include: { profile: true }
        },
        visit: {
          select: { id: true }
        }
      },
      orderBy: { scheduledAt: "asc" },
      take: 3
    }),
    db.visit.findMany({
      where: {
        AND: [buildVisitVisibilityWhere(params.workspaceId, viewer), { patientId: params.patientId }]
      },
      orderBy: [{ createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        status: true,
        appointmentId: true,
        createdAt: true
      }
    }),
    db.document.findMany({
      where: {
        AND: [buildDocumentVisibilityWhere(params.workspaceId, viewer, params.patientId), { patientId: params.patientId }]
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        processingStatus: true,
        createdAt: true
      }
    }),
    db.task.findMany({
      where: {
        AND: [buildTaskVisibilityWhere(params.workspaceId, viewer), { patientId: params.patientId }]
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        status: true
      }
    }),
    db.workspace.findUniqueOrThrow({
      where: { id: params.workspaceId },
      select: { id: true, slug: true }
    })
  ]);

  if (!patient) {
    throw new Error("QR_UNAUTHORIZED");
  }

  const todayAppointment = todayAppointments[0] ?? null;
  const activeVisit = todayAppointment?.visit?.id
    ? { id: todayAppointment.visit.id }
    : visits.find((visit) => visit.status !== "COMPLETED") ?? null;

  const baseContext: PatientScanContext = {
    patientId: patient.id,
    resolvedFrom: "qr",
    role: params.role,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    timestamp: new Date().toISOString(),
    intent: params.intent ?? "default",
    patient,
    recommendedWorkflow: {
      label: "Open patient context",
      description: "Continue with the most relevant workflow for this scan.",
      href: buildPatientSummaryHref(workspace.slug, patient.id, "qr")
    },
    activeAppointmentId: todayAppointment?.id ?? null,
    activeVisitId: activeVisit?.id ?? null,
    quickActions: [],
    todayAppointments: todayAppointments.map((appointment) => ({
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
      reason: appointment.reason,
      doctorName: appointment.doctor.profile?.fullName ?? appointment.doctor.email,
      visitId: appointment.visit?.id ?? null
    })),
    recentReports: recentReports.map((document) => ({
      id: document.id,
      title: document.title,
      processingStatus: document.processingStatus,
      createdAt: document.createdAt
    })),
    roleRelevantTasks: roleRelevantTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status
    }))
  };

  const recommendedWorkflow = getPatientScanDestination(params.role, baseContext, baseContext.intent);
  return {
    ...baseContext,
    recommendedWorkflow,
    quickActions: getQuickActions({
      role: params.role,
      workspaceSlug: workspace.slug,
      patientId: patient.id,
      todayAppointmentId: baseContext.activeAppointmentId,
      activeVisitId: baseContext.activeVisitId,
      recentReportId: baseContext.recentReports[0]?.id ?? null
    })
  };
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
    where: {
      publicId: params.publicId
    },
    include: {
      patient: {
        include: {
          workspace: true
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
    return {
      redirectTo: `/portal/login?callbackUrl=${encodeURIComponent(`/scan/${params.publicId}`)}`,
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

  if (actor.kind === "patient") {
    const redirectTo = `/portal/check-in?qr=${params.publicId}`;

    await db.patientQrIdentifier.update({
      where: { id: qr.id },
      data: { lastUsedAt: new Date() }
    });

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

    await db.patientQrIdentifier.update({
      where: { id: qr.id },
      data: { lastUsedAt: new Date() }
    });

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
        resolvedFrom: "qr",
        role: actor.role,
        workspaceId: qr.workspaceId,
        workspaceSlug: qr.patient.workspace.slug,
        timestamp: new Date().toISOString(),
        intent: params.intent ?? "default",
        patient: {
          id: qr.patient.id,
          fullName: qr.patient.fullName,
          patientCode: qr.patient.patientCode,
          phone: qr.patient.phone
        },
        recommendedWorkflow: {
          label: "Open support context",
          description: "Use support tooling and scan logs.",
          href: redirectTo
        },
        activeAppointmentId: null,
        activeVisitId: null,
        quickActions: [],
        todayAppointments: [],
        recentReports: [],
        roleRelevantTasks: []
      }
    };
  }

  let context: PatientScanContext;

  try {
    context = await buildPatientScanContext({
      workspaceId: qr.workspaceId,
      patientId: qr.patientId,
      role: actor.role,
      userId: actor.userId,
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

  const redirectTo = getScanContextRoute(qr.patient.workspace.slug, qr.patientId);

  await db.patientQrIdentifier.update({
    where: { id: qr.id },
    data: { lastUsedAt: new Date() }
  });

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
      workflow: context.recommendedWorkflow.href,
      intent: context.intent,
      activeAppointmentId: context.activeAppointmentId,
      activeVisitId: context.activeVisitId
    }
  });

  return {
    redirectTo,
    kind: "staff",
    context
  };
}
