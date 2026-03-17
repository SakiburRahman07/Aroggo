import { db } from "@/lib/db/prisma";
import { patientSchema } from "@/features/patients/validation";

async function generatePatientCode(workspaceId: string) {
  const total = await db.patient.count({ where: { workspaceId } });
  return `PAT-${String(total + 1).padStart(5, "0")}`;
}

export async function listPatients(workspaceId: string, search?: string) {
  return db.patient.findMany({
    where: {
      workspaceId,
      OR: search
        ? [
            { fullName: { contains: search, mode: "insensitive" } },
            { patientCode: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        : undefined
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function listPatientOptions(workspaceId: string) {
  return db.patient.findMany({
    where: { workspaceId },
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

export async function getPatientDetail(workspaceId: string, patientId: string) {
  return db.patient.findFirst({
    where: {
      id: patientId,
      workspaceId
    },
    include: {
      appointments: {
        orderBy: { scheduledAt: "desc" },
        take: 8,
        include: {
          doctor: {
            include: { profile: true }
          }
        }
      },
      visits: {
        orderBy: { createdAt: "desc" },
        include: {
          doctor: {
            include: { profile: true }
          }
        }
      },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 8
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          assignee: {
            include: { profile: true }
          }
        }
      }
    }
  });
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

export async function updatePatient(patientId: string, input: unknown) {
  const data = patientSchema.parse(input);

  return db.patient.update({
    where: { id: patientId },
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

