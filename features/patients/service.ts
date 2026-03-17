import { db } from "@/lib/db/prisma";
import {
  buildAppointmentVisibilityWhere,
  buildDocumentVisibilityWhere,
  buildPatientVisibilityWhere,
  buildTaskVisibilityWhere,
  buildVisitVisibilityWhere,
  getScopedDocumentAccess,
  getScopedPatientAccess,
  getScopedTaskAccess,
  getScopedVisitAccess,
  type ViewerContext
} from "@/lib/security/scopes";
import { patientSchema } from "@/features/patients/validation";
import type { Prisma } from "@prisma/client";

export type PatientListItem = Prisma.PatientGetPayload<Record<string, never>>;
export type PatientOption = Prisma.PatientGetPayload<{
  select: {
    id: true;
    fullName: true;
    patientCode: true;
  };
}>;

async function generatePatientCode(workspaceId: string) {
  const total = await db.patient.count({ where: { workspaceId } });
  return `PAT-${String(total + 1).padStart(5, "0")}`;
}

export async function listPatients(workspaceId: string, viewer: ViewerContext, search?: string): Promise<PatientListItem[]> {
  return db.patient.findMany({
    where: buildPatientVisibilityWhere(workspaceId, viewer, search),
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function listPatientOptions(workspaceId: string, viewer: ViewerContext): Promise<PatientOption[]> {
  return db.patient.findMany({
    where: buildPatientVisibilityWhere(workspaceId, viewer),
    select: {
      id: true,
      fullName: true,
      patientCode: true
    },
    orderBy: {
      fullName: "asc"
    }
  });
}

export async function getPatientDetail(workspaceId: string, patientId: string, viewer: ViewerContext) {
  const patient = await db.patient.findFirst({
    where: {
      AND: [buildPatientVisibilityWhere(workspaceId, viewer), { id: patientId }]
    }
  });

  if (!patient) {
    return null;
  }

  const patientAccess = getScopedPatientAccess(viewer.role);
  const visitAccess = getScopedVisitAccess(viewer.role);
  const taskAccess = getScopedTaskAccess(viewer.role);
  const documentAccess = getScopedDocumentAccess(viewer.role);

  const [appointments, visits, documents, tasks] = await Promise.all([
    db.appointment.findMany({
      where: {
        AND: [buildAppointmentVisibilityWhere(workspaceId, viewer), { patientId }]
      },
      orderBy: { scheduledAt: "desc" },
      take: 8,
      include: {
        doctor: {
          include: { profile: true }
        }
      }
    }),
    patientAccess.readClinical && visitAccess.read
      ? db.visit.findMany({
          where: {
            AND: [buildVisitVisibilityWhere(workspaceId, viewer), { patientId }]
          },
          orderBy: { createdAt: "desc" },
          include: {
            doctor: {
              include: { profile: true }
            }
          }
        })
      : Promise.resolve([]),
    documentAccess.readClinical || documentAccess.readLab || documentAccess.readOpsLimited
      ? db.document.findMany({
          where: {
            AND: [buildDocumentVisibilityWhere(workspaceId, viewer, patientId), { patientId }]
          },
          orderBy: { createdAt: "desc" },
          take: 8
        })
      : Promise.resolve([]),
    taskAccess.canRead
      ? db.task.findMany({
          where: {
            AND: [buildTaskVisibilityWhere(workspaceId, viewer), { patientId }]
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            assignee: {
              include: { profile: true }
            }
          }
        })
      : Promise.resolve([])
  ]);

  return {
    ...patient,
    appointments,
    visits,
    documents,
    tasks
  };
}

export async function createPatient(workspaceId: string, createdById: string, input: unknown) {
  const data = patientSchema.parse(input);

  return db.patient.create({
    data: {
      workspaceId,
      createdById,
      patientCode: await generatePatientCode(workspaceId),
      fullName: data.fullName,
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      emergencyContact: data.emergencyContact || null,
      notes: data.notes || null
    }
  });
}

export async function updatePatient(workspaceId: string, patientId: string, viewer: ViewerContext, input: unknown) {
  const data = patientSchema.parse(input);
  const patient = await db.patient.findFirst({
    where: {
      AND: [buildPatientVisibilityWhere(workspaceId, viewer), { id: patientId }]
    },
    select: { id: true }
  });

  if (!patient) {
    throw new Error("Patient not found in the current access scope.");
  }

  return db.patient.update({
    where: { id: patient.id },
    data: {
      fullName: data.fullName,
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      emergencyContact: data.emergencyContact || null,
      notes: data.notes || null
    }
  });
}
