import { addMinutes, endOfDay, isAfter, isBefore, startOfDay, subHours } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { buildAppointmentVisibilityWhere, buildTaskVisibilityWhere, type ViewerContext } from "@/lib/security/scopes";
import { appointmentSchema, appointmentStatusSchema } from "@/features/appointments/validation";

export type AppointmentListItem = Prisma.AppointmentGetPayload<{
  include: {
    patient: true;
    doctor: {
      include: { profile: true };
    };
  };
}>;

export type AppointmentDetail = Prisma.AppointmentGetPayload<{
  include: {
    patient: true;
    doctor: {
      include: { profile: true };
    };
    visit: true;
    tasks: {
      include: {
        assignee: {
          include: { profile: true };
        };
      };
    };
  };
}>;

export type AppointmentDoctorOption = Prisma.MembershipGetPayload<{
  include: {
    user: {
      include: {
        profile: true;
      };
    };
  };
}>;

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

export async function listAppointments(workspaceId: string, viewer: ViewerContext): Promise<AppointmentListItem[]> {
  return db.appointment.findMany({
    where: buildAppointmentVisibilityWhere(workspaceId, viewer),
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

export async function getAppointmentDetail(workspaceId: string, appointmentId: string, viewer: ViewerContext): Promise<AppointmentDetail | null> {
  return db.appointment.findFirst({
    where: {
      AND: [buildAppointmentVisibilityWhere(workspaceId, viewer), { id: appointmentId }]
    },
    include: {
      patient: true,
      doctor: {
        include: { profile: true }
      },
      visit: true,
      tasks: {
        where: buildTaskVisibilityWhere(workspaceId, viewer),
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

export async function listDoctorOptions(workspaceId: string): Promise<AppointmentDoctorOption[]> {
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
      status: "SCHEDULED",
      flowState: "SCHEDULED"
    }
  });
}

export async function updateAppointmentStatus(workspaceId: string, appointmentId: string, viewer: ViewerContext, input: unknown) {
  const data = appointmentStatusSchema.parse(input);
  const appointment = await db.appointment.findFirst({
    where: {
      AND: [buildAppointmentVisibilityWhere(workspaceId, viewer), { id: appointmentId }]
    },
    select: { id: true }
  });

  if (!appointment) {
    throw new Error("Appointment not found in the current access scope.");
  }

  const flowState = data.status === "CONFIRMED"
    ? "CONFIRMED"
    : data.status === "CHECKED_IN"
      ? "ARRIVED"
      : data.status === "IN_PROGRESS"
        ? "IN_CONSULTATION"
        : data.status === "COMPLETED"
          ? "COMPLETED"
          : data.status === "CANCELLED"
            ? "CANCELLED"
            : data.status === "NO_SHOW"
              ? "NO_SHOW"
              : "SCHEDULED";

  return db.appointment.update({
    where: { id: appointment.id },
    data: {
      status: data.status,
      flowState,
      arrivedAt: data.status === "CHECKED_IN" ? new Date() : undefined,
      checkedOutAt: data.status === "COMPLETED" ? new Date() : undefined
    }
  });
}

export async function ensureVisitForAppointment(workspaceId: string, appointmentId: string, viewer: ViewerContext) {
  const appointment = await db.appointment.findFirst({
    where: {
      AND: [buildAppointmentVisibilityWhere(workspaceId, viewer), { id: appointmentId }]
    },
    select: {
      id: true,
      doctorUserId: true,
      patientId: true,
      visit: {
        select: { id: true }
      }
    }
  });

  if (!appointment) {
    throw new Error("Appointment not found in the current access scope.");
  }

  if (appointment.visit) {
    return appointment.visit;
  }

  return db.visit.create({
    data: {
      workspaceId,
      appointmentId: appointment.id,
      doctorUserId: appointment.doctorUserId,
      patientId: appointment.patientId,
      status: "DRAFT"
    }
  });
}
