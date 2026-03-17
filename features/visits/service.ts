import { db } from "@/lib/db/prisma";
import { visitSchema } from "@/features/visits/validation";

export async function getVisitDetail(workspaceId: string, visitId: string) {
  return db.visit.findFirst({
    where: {
      id: visitId,
      workspaceId
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

export async function updateVisit(visitId: string, input: unknown) {
  const data = visitSchema.parse(input);

  return db.visit.update({
    where: { id: visitId },
    data: {
      symptoms: data.symptoms || null,
      observations: data.observations || null,
      diagnosisNote: data.diagnosisNote || null,
      prescriptionText: data.prescriptionText || null,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      status: data.status
    }
  });
}

export async function setVisitAiDraft(visitId: string, aiDraft: string) {
  return db.visit.update({
    where: { id: visitId },
    data: {
      aiDraft
    }
  });
}

