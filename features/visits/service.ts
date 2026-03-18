import { db } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { buildVisitVisibilityWhere, type ViewerContext } from "@/lib/security/scopes";
import { visitSchema } from "@/features/visits/validation";

export async function listVisits(workspaceId: string, viewer: ViewerContext) {
  return db.visit.findMany({
    where: buildVisitVisibilityWhere(workspaceId, viewer),
    include: {
      patient: true,
      appointment: true,
      doctor: {
        include: { profile: true }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

export async function getVisitDetail(workspaceId: string, visitId: string, viewer: ViewerContext) {
  return db.visit.findFirst({
    where: {
      AND: [buildVisitVisibilityWhere(workspaceId, viewer), { id: visitId }]
    },
    include: {
      patient: true,
      appointment: true,
      doctor: {
        include: { profile: true }
      }
    }
  });
}

export async function updateVisit(workspaceId: string, visitId: string, viewer: ViewerContext, input: unknown) {
  const data = visitSchema.parse(input);
  const visit = await db.visit.findFirst({
    where: {
      AND: [buildVisitVisibilityWhere(workspaceId, viewer), { id: visitId }]
    },
    select: { id: true }
  });

  if (!visit) {
    throw new AppError({
      code: "NOT_FOUND_ERROR",
      message: "Visit not found in scope.",
      userMessage: "Visit not found in the current access scope."
    });
  }

  return db.visit.update({
    where: { id: visit.id },
    data: {
      symptoms: data.symptoms || null,
      observations: data.observations || null,
      diagnosisNote: data.diagnosisNote || null,
      prescriptionText: data.prescriptionText || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      status: data.status,
      reviewedAt: data.status === "COMPLETED" ? new Date() : undefined
    }
  });
}

export async function setVisitAiDraft(workspaceId: string, visitId: string, viewer: ViewerContext, aiDraft: string) {
  const visit = await db.visit.findFirst({
    where: {
      AND: [buildVisitVisibilityWhere(workspaceId, viewer), { id: visitId }]
    },
    select: { id: true }
  });

  if (!visit) {
    throw new AppError({
      code: "NOT_FOUND_ERROR",
      message: "Visit not found in scope.",
      userMessage: "Visit not found in the current access scope."
    });
  }

  return db.visit.update({
    where: { id: visit.id },
    data: {
      aiDraft
    }
  });
}
