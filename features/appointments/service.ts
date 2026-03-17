import { addMinutes, endOfDay, isBefore, isAfter, startOfDay, subHours } from "date-fns";
import { db } from "@/lib/db/prisma";
import { appointmentSchema, appointmentStatusSchema } from "@/features/appointments/validation";

function hasScheduleConflict(
  incomingStart: Date,
  incomingDuration: number,
  existingStart: Date,
  existingDuration: number
) {
  const incomingEnd = addMinutes(incomingStart, incomingDuration);
  const existingEnd = addMinutes(existingStart, existingDuration);

  return isBefore(incomingStart, existingEnd) && isAfter(incomingEnd, existingStart);
}

export async function listAppointments(workspaceId: string) {
  return db.appointment.findMany({
    where: { workspaceId },
    include: {
      patient: true,
      doctor: {
        include: { profile: true }
      }
    },
    orderBy: {
      scheduledAt: "asc"
    }
  });
}

export async function getAppointmentDetail(workspaceId: string, appointmentId: string) {
  return db.appointment.findFirst({
    where: {
      id: appointmentId,
      workspaceId
    },
    include: {
      patient: true,
      doctor: {
        include: { profile: true }
      },
      visit: true,
      tasks: {
        include: {
          assignee: {
            include: { profile: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function listDoctorOptions(workspaceId: string) {
  return db.membership.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      role: "DOCTOR"
    },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });
}

export async function createAppointment(workspaceId: string, createdById: string, input: unknown) {
  const data = appointmentSchema.parse(input);
  const scheduledAt = new Date(data.scheduledAt);
  const candidates = await db.appointment.findMany({
    where: {
      workspaceId,
      doctorUserId: data.doctorUserId,
      status: {
        notIn: ["CANCELLED", "NO_SHOW"]
      },
      scheduledAt: {
        gte: subHours(startOfDay(scheduledAt), 1),
        lte: endOfDay(scheduledAt)
      }
    }
  });

  const conflict = candidates.find((candidate) =>
    hasScheduleConflict(scheduledAt, data.durationMinutes, candidate.scheduledAt, candidate.durationMinutes)
  );

  if (conflict) {
    throw new Error("The selected doctor already has an overlapping appointment.");
  }

  return db.appointment.create({
    data: {
      workspaceId,
      createdById,
      patientId: data.patientId,
      doctorUserId: data.doctorUserId,
      scheduledAt,
      durationMinutes: data.durationMinutes,
      reason: data.reason,
      notes: data.notes || null,
      status: "SCHEDULED"
    }
  });
}

export async function updateAppointmentStatus(appointmentId: string, input: unknown) {
  const data = appointmentStatusSchema.parse(input);

  return db.appointment.update({
    where: { id: appointmentId },
    data: {
      status: data.status
    }
  });
}

export async function ensureVisitForAppointment(workspaceId: string, appointmentId: string, doctorUserId: string, patientId: string) {
  const existing = await db.visit.findUnique({ where: { appointmentId } });

  if (existing) {
    return existing;
  }

  return db.visit.create({
    data: {
      workspaceId,
      appointmentId,
      doctorUserId,
      patientId,
      status: "DRAFT"
    }
  });
}
