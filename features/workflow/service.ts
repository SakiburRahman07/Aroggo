import { endOfDay, startOfDay } from "date-fns";
import { type AppointmentStatus, type PatientAdminState, type PatientFlowState, type Role } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import {
  buildAppointmentVisibilityWhere,
  buildDocumentVisibilityWhere,
  buildPatientVisibilityWhere,
  buildTaskVisibilityWhere,
  buildVisitVisibilityWhere,
  type ViewerContext
} from "@/lib/security/scopes";

export type WorkflowResolvedFrom = "qr" | "search" | "schedule" | "portal";
export type WorkflowIntent = "default" | "check_in" | "visit" | "report_upload" | "patient_summary";
export type WorkflowSurface = "front-desk" | "doctor" | "lab" | "operations" | "admin" | "support";
export type WorkflowState = PatientFlowState | PatientAdminState;

export type WorkflowQuickAction = {
  key: string;
  label: string;
  description: string;
  href: string;
  tone?: "primary" | "secondary" | "success" | "warning";
};

export type WorkflowDestination = {
  surface: WorkflowSurface;
  label: string;
  description: string;
  href: string;
};

export type ActivePatientContext = {
  patientId: string;
  workspaceId: string;
  workspaceSlug: string;
  role: Role;
  resolvedFrom: WorkflowResolvedFrom;
  intent: WorkflowIntent;
  timestamp: string;
  currentWorkflowState: WorkflowState;
  patient: {
    id: string;
    fullName: string;
    patientCode: string;
    phone: string;
    email: string | null;
    dob: Date | null;
    adminState: PatientAdminState;
    portalEnabled: boolean;
  };
  activeAppointmentId: string | null;
  activeVisitId: string | null;
  activeLabOrderId: string | null;
  recommendedNextRoute: WorkflowDestination;
  recommendedQuickActions: WorkflowQuickAction[];
  blockers: string[];
  activeAppointment: {
    id: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    flowState: PatientFlowState;
    reason: string;
    notes: string | null;
    doctorName: string;
    visitId: string | null;
    arrivedAt: Date | null;
    readyForProviderAt: Date | null;
    checkedOutAt: Date | null;
  } | null;
  recentAppointments: Array<{
    id: string;
    scheduledAt: Date;
    status: AppointmentStatus;
    flowState: PatientFlowState;
    reason: string;
    doctorName: string;
  }>;
  activeVisit: {
    id: string;
    status: string;
    symptoms: string | null;
    observations: string | null;
    diagnosisNote: string | null;
    prescriptionText: string | null;
    patientSummary: string | null;
    followUpInstructions: string | null;
    createdAt: Date;
    followUpDate: Date | null;
  } | null;
  previousVisits: Array<{
    id: string;
    createdAt: Date;
    status: string;
    diagnosisNote: string | null;
    prescriptionText: string | null;
    followUpDate: Date | null;
    doctorName: string;
  }>;
  labOrders: Array<{
    id: string;
    testName: string;
    status: string;
    indication: string | null;
    orderedAt: Date;
    resultUploadedAt: Date | null;
    doctorReviewedAt: Date | null;
    resultDocumentId: string | null;
  }>;
  recentReports: Array<{
    id: string;
    title: string;
    processingStatus: string;
    releasedToPatient: boolean;
    createdAt: Date;
  }>;
  followUpTasks: Array<{
    id: string;
    title: string;
    status: string;
    dueAt: Date | null;
  }>;
};

function getViewer(role: Role, userId: string): ViewerContext {
  return { role, userId };
}

export function getWorkflowSurfacePath(workspaceSlug: string, surface: WorkflowSurface, patientId: string) {
  return `/app/${workspaceSlug}/workflow/${surface}/${patientId}`;
}

export function getWorkflowResolverPath(
  workspaceSlug: string,
  patientId: string,
  resolvedFrom: WorkflowResolvedFrom = "search",
  intent: WorkflowIntent = "default"
) {
  return `/app/${workspaceSlug}/workflow/patient/${patientId}?resolvedFrom=${resolvedFrom}&intent=${intent}`;
}

function isTerminalFlowState(state: PatientFlowState) {
  return ["CHECKED_OUT", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(state);
}

function determineWorkflowState(params: {
  adminState: PatientAdminState;
  activeAppointment?: { flowState: PatientFlowState } | null;
  activeVisit?: { status: string } | null;
  pendingLabOrder?: { status: string } | null;
}): WorkflowState {
  if (params.activeAppointment?.flowState) {
    return params.activeAppointment.flowState;
  }

  if (params.pendingLabOrder) {
    if (params.pendingLabOrder.status === "DOCTOR_REVIEW_PENDING") {
      return "WAITING_FOR_RESULT";
    }

    if (["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "RESULT_UPLOADED"].includes(params.pendingLabOrder.status)) {
      return "SENT_TO_LAB";
    }
  }

  if (params.activeVisit && params.activeVisit.status !== "COMPLETED") {
    return "IN_CONSULTATION";
  }

  return params.adminState;
}

function buildDestination(role: Role, context: Omit<ActivePatientContext, "recommendedNextRoute" | "recommendedQuickActions">): WorkflowDestination {
  switch (role) {
    case "RECEPTIONIST":
      return {
        surface: "front-desk",
        label: context.activeAppointment ? "Open front-desk intake" : "Open registration and booking context",
        description: context.activeAppointment
          ? "Continue arrival verification, intake, check-in, and provider queue handoff."
          : "No active appointment was found, so open a front-desk-safe registration and booking workflow.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "front-desk", context.patientId)
      };
    case "DOCTOR":
      return {
        surface: "doctor",
        label: context.activeAppointment || context.activeVisit ? "Open doctor encounter workspace" : "Open patient clinical summary",
        description: context.activeAppointment || context.activeVisit
          ? "Continue consultation with the patient timeline, orders, reports, and visit note in one place."
          : "No active encounter was found, so open the clinical summary and prior record review view.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "doctor", context.patientId)
      };
    case "LAB_STAFF":
      return {
        surface: "lab",
        label: context.labOrders.length > 0 ? "Open lab order workflow" : "Open lab intake context",
        description: context.labOrders.length > 0
          ? "Match the patient to current orders, upload results, and push the case to doctor review."
          : "No open order is attached yet, so open the lab intake context for matching or upload.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "lab", context.patientId)
      };
    case "OPERATIONS_MANAGER":
      return {
        surface: "operations",
        label: "Open operational patient status",
        description: "Review stage, blockers, queue state, and throughput-safe patient context.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "operations", context.patientId)
      };
    case "CLINIC_ADMIN":
      return {
        surface: "admin",
        label: "Open clinic admin patient view",
        description: "Inspect the full workflow, release state, and patient progression across teams.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "admin", context.patientId)
      };
    default:
      return {
        surface: "support",
        label: "Open support context",
        description: "Use support tooling for this patient and scan event.",
        href: `/admin/support?patientId=${context.patientId}&source=${context.resolvedFrom}`
      };
  }
}

function buildQuickActions(context: Omit<ActivePatientContext, "recommendedNextRoute" | "recommendedQuickActions">): WorkflowQuickAction[] {
  const workflowResolverHref = getWorkflowResolverPath(context.workspaceSlug, context.patientId, context.resolvedFrom, context.intent);
  const actionsByRole: Record<Role, WorkflowQuickAction[]> = {
    SUPER_ADMIN: [
      {
        key: "support",
        label: "Open support context",
        description: "Review logs and support tooling for this patient.",
        href: `/admin/support?patientId=${context.patientId}&source=${context.resolvedFrom}`,
        tone: "primary"
      }
    ],
    CLINIC_ADMIN: [
      {
        key: "admin-view",
        label: "Open full profile",
        description: "Inspect the end-to-end workflow and patient context.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "admin", context.patientId),
        tone: "primary"
      },
      {
        key: "appointment",
        label: "Book or reschedule",
        description: "Open booking with this patient preselected.",
        href: `/app/${context.workspaceSlug}/appointments/new?patientId=${context.patientId}`
      },
      {
        key: "resolver",
        label: "Re-run workflow routing",
        description: "Re-evaluate the best role-aware destination for this patient.",
        href: workflowResolverHref
      }
    ],
    DOCTOR: [
      {
        key: "doctor-workspace",
        label: "Start consultation",
        description: "Open the encounter workspace with prior history, reports, and note-taking ready.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "doctor", context.patientId),
        tone: "primary"
      },
      {
        key: "visit",
        label: "Continue visit note",
        description: "Jump directly into the visit workspace or open encounter summary.",
        href: context.activeVisitId
          ? `/app/${context.workspaceSlug}/visits/${context.activeVisitId}`
          : getWorkflowSurfacePath(context.workspaceSlug, "doctor", context.patientId),
        tone: "success"
      },
      {
        key: "reports",
        label: "Review reports",
        description: "Open patient-linked reports and doctor review context.",
        href: `/app/${context.workspaceSlug}/documents?patientId=${context.patientId}`
      },
      {
        key: "history",
        label: "Review previous history",
        description: "Inspect previous visits and prescriptions.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "doctor", context.patientId)
      }
    ],
    RECEPTIONIST: [
      {
        key: "front-desk",
        label: "Open front-desk context",
        description: "Continue demographic verification, check-in, and queueing.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "front-desk", context.patientId),
        tone: "primary"
      },
      {
        key: "book",
        label: "Book follow-up",
        description: "Open booking with this patient already selected.",
        href: `/app/${context.workspaceSlug}/appointments/new?patientId=${context.patientId}`
      },
      {
        key: "profile",
        label: "Update info",
        description: "Edit demographics and contact details.",
        href: `/app/${context.workspaceSlug}/patients/${context.patientId}`
      },
      {
        key: "resolver",
        label: "Re-run patient routing",
        description: "Use the same workflow destination logic from manual search.",
        href: workflowResolverHref
      }
    ],
    LAB_STAFF: [
      {
        key: "lab-context",
        label: "Open lab patient context",
        description: "Continue order matching, result processing, and review handoff.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "lab", context.patientId),
        tone: "primary"
      },
      {
        key: "report-upload",
        label: "Upload report",
        description: "Open the report queue with this patient selected.",
        href: `/app/${context.workspaceSlug}/documents?patientId=${context.patientId}&scan=lab`
      },
      {
        key: "resolver",
        label: "Re-run patient routing",
        description: "Recalculate the best lab continuation route.",
        href: workflowResolverHref
      }
    ],
    OPERATIONS_MANAGER: [
      {
        key: "operations-context",
        label: "Open operational view",
        description: "Inspect stage, blockers, and queue-safe workflow status.",
        href: getWorkflowSurfacePath(context.workspaceSlug, "operations", context.patientId),
        tone: "primary"
      },
      {
        key: "analytics",
        label: "Open analytics",
        description: "Review aggregate throughput and bottlenecks.",
        href: `/app/${context.workspaceSlug}/analytics`
      },
      {
        key: "resolver",
        label: "Re-run patient routing",
        description: "Refresh the current state and recommended operational route.",
        href: workflowResolverHref
      }
    ]
  };

  return actionsByRole[context.role] ?? [];
}

export function getRoleSpecificPatientDestination(role: Role, context: Omit<ActivePatientContext, "recommendedNextRoute" | "recommendedQuickActions">) {
  return buildDestination(role, context);
}

export function getCurrentPatientWorkflowState(context: Pick<ActivePatientContext, "currentWorkflowState">) {
  return context.currentWorkflowState;
}

export function getRecommendedNextActions(context: Omit<ActivePatientContext, "recommendedNextRoute" | "recommendedQuickActions">) {
  return buildQuickActions(context);
}

export async function buildActivePatientContext(params: {
  workspaceId: string;
  patientId: string;
  role: Role;
  userId: string;
  resolvedFrom: WorkflowResolvedFrom;
  intent?: WorkflowIntent;
}) {
  const viewer = getViewer(params.role, params.userId);
  const [workspace, patient, appointments, visits, labOrders, recentReports, followUpTasks] = await Promise.all([
    db.workspace.findUniqueOrThrow({
      where: { id: params.workspaceId },
      select: { id: true, slug: true }
    }),
    db.patient.findFirst({
      where: {
        AND: [buildPatientVisibilityWhere(params.workspaceId, viewer), { id: params.patientId }]
      },
      select: {
        id: true,
        fullName: true,
        patientCode: true,
        phone: true,
        email: true,
        dob: true,
        adminState: true,
        portalEnabled: true
      }
    }),
    db.appointment.findMany({
      where: {
        AND: [buildAppointmentVisibilityWhere(params.workspaceId, viewer), { patientId: params.patientId }]
      },
      include: {
        doctor: { include: { profile: true } },
        visit: { select: { id: true } }
      },
      orderBy: [{ scheduledAt: "asc" }],
      take: 8
    }),
    db.visit.findMany({
      where: {
        AND: [buildVisitVisibilityWhere(params.workspaceId, viewer), { patientId: params.patientId }]
      },
      include: {
        doctor: { include: { profile: true } }
      },
      orderBy: [{ createdAt: "desc" }],
      take: 8
    }),
    db.labOrder.findMany({
      where: {
        workspaceId: params.workspaceId,
        patientId: params.patientId
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8
    }),
    db.document.findMany({
      where: {
        AND: [buildDocumentVisibilityWhere(params.workspaceId, viewer, params.patientId), { patientId: params.patientId }]
      },
      orderBy: [{ createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        processingStatus: true,
        releasedToPatient: true,
        createdAt: true
      }
    }),
    db.task.findMany({
      where: {
        AND: [buildTaskVisibilityWhere(params.workspaceId, viewer), { patientId: params.patientId }]
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true
      }
    })
  ]);

  if (!patient) {
    throw new Error("Patient not found in current scope.");
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const activeAppointment =
    appointments.find((appointment) => appointment.scheduledAt >= todayStart && appointment.scheduledAt <= todayEnd && !isTerminalFlowState(appointment.flowState)) ??
    appointments.find((appointment) => !isTerminalFlowState(appointment.flowState)) ??
    null;

  const activeVisit =
    visits.find((visit) => visit.appointmentId === activeAppointment?.id && visit.status !== "COMPLETED") ??
    visits.find((visit) => visit.status !== "COMPLETED") ??
    null;

  const openLabOrders = labOrders.filter((order) => order.status !== "RELEASED_TO_PATIENT" && order.status !== "CANCELLED");
  const currentState = determineWorkflowState({
    adminState: patient.adminState,
    activeAppointment,
    activeVisit,
    pendingLabOrder: openLabOrders[0] ?? null
  });

  const baseContext = {
    patientId: patient.id,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    role: params.role,
    resolvedFrom: params.resolvedFrom,
    intent: params.intent ?? "default",
    timestamp: now.toISOString(),
    currentWorkflowState: currentState,
    patient,
    activeAppointmentId: activeAppointment?.id ?? null,
    activeVisitId: activeVisit?.id ?? null,
    activeLabOrderId: openLabOrders[0]?.id ?? null,
    blockers: [
      ...(activeAppointment ? [] : ["No active appointment is scheduled for today."]),
      ...(params.role === "LAB_STAFF" && openLabOrders.length === 0 ? ["No active lab order is attached to this patient."] : [])
    ],
    activeAppointment: activeAppointment
      ? {
          id: activeAppointment.id,
          scheduledAt: activeAppointment.scheduledAt,
          status: activeAppointment.status,
          flowState: activeAppointment.flowState,
          reason: activeAppointment.reason,
          notes: activeAppointment.notes,
          doctorName: activeAppointment.doctor.profile?.fullName ?? activeAppointment.doctor.email,
          visitId: activeAppointment.visit?.id ?? null,
          arrivedAt: activeAppointment.arrivedAt,
          readyForProviderAt: activeAppointment.readyForProviderAt,
          checkedOutAt: activeAppointment.checkedOutAt
        }
      : null,
    recentAppointments: appointments.map((appointment) => ({
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
      flowState: appointment.flowState,
      reason: appointment.reason,
      doctorName: appointment.doctor.profile?.fullName ?? appointment.doctor.email
    })),
    activeVisit: activeVisit
      ? {
          id: activeVisit.id,
          status: activeVisit.status,
          symptoms: activeVisit.symptoms,
          observations: activeVisit.observations,
          diagnosisNote: activeVisit.diagnosisNote,
          prescriptionText: activeVisit.prescriptionText,
          patientSummary: activeVisit.patientSummary,
          followUpInstructions: activeVisit.followUpInstructions,
          createdAt: activeVisit.createdAt,
          followUpDate: activeVisit.followUpDate
        }
      : null,
    previousVisits: visits.map((visit) => ({
      id: visit.id,
      createdAt: visit.createdAt,
      status: visit.status,
      diagnosisNote: visit.diagnosisNote,
      prescriptionText: visit.prescriptionText,
      followUpDate: visit.followUpDate,
      doctorName: visit.doctor.profile?.fullName ?? visit.doctor.email
    })),
    labOrders: labOrders.map((order) => ({
      id: order.id,
      testName: order.testName,
      status: order.status,
      indication: order.indication,
      orderedAt: order.orderedAt,
      resultUploadedAt: order.resultUploadedAt,
      doctorReviewedAt: order.doctorReviewedAt,
      resultDocumentId: order.resultDocumentId
    })),
    recentReports,
    followUpTasks
  } satisfies Omit<ActivePatientContext, "recommendedNextRoute" | "recommendedQuickActions">;

  return {
    ...baseContext,
    recommendedNextRoute: buildDestination(params.role, baseContext),
    recommendedQuickActions: buildQuickActions(baseContext)
  } satisfies ActivePatientContext;
}

export async function resolvePatientFromSearch(params: {
  workspaceId: string;
  workspaceSlug: string;
  patientId: string;
  role: Role;
  userId: string;
  resolvedFrom?: WorkflowResolvedFrom;
  intent?: WorkflowIntent;
}) {
  const context = await buildActivePatientContext({
    workspaceId: params.workspaceId,
    patientId: params.patientId,
    role: params.role,
    userId: params.userId,
    resolvedFrom: params.resolvedFrom ?? "search",
    intent: params.intent
  });

  return {
    context,
    redirectTo: context.recommendedNextRoute.href
  };
}

function getFlowStateStatus(nextState: PatientFlowState): AppointmentStatus {
  switch (nextState) {
    case "ARRIVED":
    case "READY_FOR_PROVIDER":
      return "CHECKED_IN";
    case "IN_CONSULTATION":
    case "SENT_TO_LAB":
    case "WAITING_FOR_RESULT":
    case "REVIEWED":
      return "IN_PROGRESS";
    case "CHECKED_OUT":
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    case "NO_SHOW":
      return "NO_SHOW";
    default:
      return "SCHEDULED";
  }
}

export async function transitionAppointmentWorkflow(params: {
  workspaceId: string;
  appointmentId: string;
  viewer: ViewerContext;
  nextState: PatientFlowState;
}) {
  const appointment = await db.appointment.findFirst({
    where: {
      AND: [buildAppointmentVisibilityWhere(params.workspaceId, params.viewer), { id: params.appointmentId }]
    },
    select: {
      id: true,
      patientId: true,
      visit: { select: { id: true } }
    }
  });

  if (!appointment) {
    throw new Error("Appointment not found in the current access scope.");
  }

  const now = new Date();
  const updated = await db.appointment.update({
    where: { id: appointment.id },
    data: {
      flowState: params.nextState,
      status: getFlowStateStatus(params.nextState),
      arrivedAt: params.nextState === "ARRIVED" ? now : undefined,
      readyForProviderAt: params.nextState === "READY_FOR_PROVIDER" ? now : undefined,
      checkedOutAt: params.nextState === "CHECKED_OUT" || params.nextState === "COMPLETED" ? now : undefined
    }
  });

  if (params.nextState === "IN_CONSULTATION") {
    if (appointment.visit) {
      await db.visit.update({
        where: { id: appointment.visit.id },
        data: {
          startedConsultationAt: now,
          reviewedAt: null
        }
      });
    } else {
      await db.visit.create({
        data: {
          workspaceId: params.workspaceId,
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorUserId: params.viewer.userId,
          status: "DRAFT",
          startedConsultationAt: now
        }
      });
    }
  }

  return updated;
}

export async function createLabOrderForPatient(params: {
  workspaceId: string;
  patientId: string;
  doctorUserId: string;
  viewer: ViewerContext;
  testName: string;
  indication?: string | null;
  notes?: string | null;
  appointmentId?: string | null;
  visitId?: string | null;
}) {
  const patient = await db.patient.findFirst({
    where: {
      AND: [buildPatientVisibilityWhere(params.workspaceId, params.viewer), { id: params.patientId }]
    },
    select: { id: true }
  });

  if (!patient) {
    throw new Error("Patient not found in the current access scope.");
  }

  const order = await db.labOrder.create({
    data: {
      workspaceId: params.workspaceId,
      patientId: params.patientId,
      appointmentId: params.appointmentId ?? null,
      visitId: params.visitId ?? null,
      orderedByDoctorId: params.doctorUserId,
      testName: params.testName,
      indication: params.indication ?? null,
      notes: params.notes ?? null,
      status: "ORDERED"
    }
  });

  if (params.appointmentId) {
    await db.appointment.update({
      where: { id: params.appointmentId },
      data: {
        flowState: "SENT_TO_LAB",
        status: "IN_PROGRESS"
      }
    });
  }

  return order;
}

export async function transitionLabOrderStatus(params: {
  workspaceId: string;
  orderId: string;
  viewer: ViewerContext;
  processedByUserId: string;
  nextStatus: "SAMPLE_COLLECTED" | "PROCESSING" | "RESULT_UPLOADED" | "DOCTOR_REVIEW_PENDING" | "DOCTOR_REVIEWED" | "RELEASED_TO_PATIENT";
}) {
  const order = await db.labOrder.findFirst({
    where: {
      workspaceId: params.workspaceId,
      id: params.orderId
    },
    select: {
      id: true,
      appointmentId: true,
      resultDocumentId: true
    }
  });

  if (!order) {
    throw new Error("Lab order not found.");
  }

  const now = new Date();
  const updated = await db.labOrder.update({
    where: { id: order.id },
    data: {
      status: params.nextStatus,
      processedByUserId: params.processedByUserId,
      sampleCollectedAt: params.nextStatus === "SAMPLE_COLLECTED" ? now : undefined,
      processingStartedAt: params.nextStatus === "PROCESSING" ? now : undefined,
      resultUploadedAt: params.nextStatus === "RESULT_UPLOADED" || params.nextStatus === "DOCTOR_REVIEW_PENDING" ? now : undefined,
      doctorReviewedAt: params.nextStatus === "DOCTOR_REVIEWED" || params.nextStatus === "RELEASED_TO_PATIENT" ? now : undefined,
      releasedAt: params.nextStatus === "RELEASED_TO_PATIENT" ? now : undefined
    }
  });

  if (order.appointmentId) {
    const appointmentFlowState: PatientFlowState =
      params.nextStatus === "SAMPLE_COLLECTED" || params.nextStatus === "PROCESSING"
        ? "SENT_TO_LAB"
        : params.nextStatus === "RESULT_UPLOADED" || params.nextStatus === "DOCTOR_REVIEW_PENDING"
          ? "WAITING_FOR_RESULT"
          : "REVIEWED";

    await db.appointment.update({
      where: { id: order.appointmentId },
      data: {
        flowState: appointmentFlowState,
        status: appointmentFlowState === "REVIEWED" ? "IN_PROGRESS" : "IN_PROGRESS"
      }
    });
  }

  if (params.nextStatus === "RELEASED_TO_PATIENT" && order.resultDocumentId) {
    await db.document.update({
      where: { id: order.resultDocumentId },
      data: {
        clinicalState: "RELEASED_TO_PATIENT",
        releasedToPatient: true,
        releasedAt: now,
        releasedById: params.processedByUserId
      }
    });
  }

  return updated;
}
