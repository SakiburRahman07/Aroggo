import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";
import { buildPatientVisibilityWhere, buildTaskVisibilityWhere } from "@/lib/security/scopes";
import { getWorkspaceAnalytics } from "@/features/analytics/service";

export type ReceptionRecentPatient = Prisma.PatientGetPayload<Record<string, never>>;

export async function getClinicAdminDashboard(workspaceId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [analytics, activePatients, activeMembers, openInvites, upcomingAppointments, priorityTasks] = await Promise.all([
    getWorkspaceAnalytics(workspaceId),
    db.patient.count({ where: { workspaceId } }),
    db.membership.count({ where: { workspaceId, status: "ACTIVE" } }),
    db.workspaceInvite.count({ where: { workspaceId, status: "PENDING" } }),
    db.appointment.findMany({
      where: {
        workspaceId,
        scheduledAt: { gte: todayStart, lte: todayEnd }
      },
      include: {
        patient: true,
        doctor: {
          include: { profile: true }
        }
      },
      orderBy: { scheduledAt: "asc" },
      take: 6
    }),
    db.task.findMany({
      where: {
        workspaceId,
        status: { not: "COMPLETED" },
        priority: { in: ["HIGH", "URGENT"] }
      },
      include: {
        assignee: {
          include: { profile: true }
        },
        patient: true
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 6
    })
  ]);

  return {
    analytics,
    activePatients,
    activeMembers,
    openInvites,
    upcomingAppointments,
    priorityTasks
  };
}

export async function getDoctorDashboard(workspaceId: string, userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const nextTwoWeeks = addDays(now, 14);

  const [todayAppointments, followUps, assignedTasks, recentReports, patientCount, draftVisits] = await Promise.all([
    db.appointment.findMany({
      where: {
        workspaceId,
        doctorUserId: userId,
        scheduledAt: { gte: todayStart, lte: todayEnd }
      },
      include: {
        patient: true
      },
      orderBy: { scheduledAt: "asc" },
      take: 8
    }),
    db.visit.findMany({
      where: {
        workspaceId,
        doctorUserId: userId,
        followUpDate: { gte: todayStart, lte: nextTwoWeeks }
      },
      include: {
        patient: true
      },
      orderBy: { followUpDate: "asc" },
      take: 5
    }),
    db.task.findMany({
      where: buildTaskVisibilityWhere(workspaceId, { role: "DOCTOR", userId }),
      include: {
        patient: true,
        appointment: true
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 6
    }),
    db.document.findMany({
      where: {
        workspaceId,
        docType: { in: ["LAB_REPORT", "IMAGING", "PRESCRIPTION"] },
        OR: [
          { patient: { appointments: { some: { doctorUserId: userId } } } },
          { patient: { visits: { some: { doctorUserId: userId } } } }
        ]
      },
      include: {
        patient: true
      },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    db.patient.count({
      where: buildPatientVisibilityWhere(workspaceId, { role: "DOCTOR", userId })
    }),
    db.visit.count({
      where: {
        workspaceId,
        doctorUserId: userId,
        status: "DRAFT"
      }
    })
  ]);

  return {
    todayAppointments,
    followUps,
    assignedTasks,
    recentReports,
    patientCount,
    draftVisits,
    waitingCount: todayAppointments.filter((appointment) => ["CONFIRMED", "CHECKED_IN"].includes(appointment.status)).length
  };
}

export async function getReceptionDashboard(workspaceId: string, userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrow = addDays(now, 1);

  const [todayAppointments, checkedInToday, noShowsLastWeek, reminderQueue, recentPatients, frontDeskTasks] = await Promise.all([
    db.appointment.findMany({
      where: {
        workspaceId,
        scheduledAt: { gte: todayStart, lte: todayEnd }
      },
      include: {
        patient: true,
        doctor: {
          include: { profile: true }
        }
      },
      orderBy: { scheduledAt: "asc" },
      take: 8
    }),
    db.appointment.count({
      where: {
        workspaceId,
        status: "CHECKED_IN",
        scheduledAt: { gte: todayStart, lte: todayEnd }
      }
    }),
    db.appointment.count({
      where: {
        workspaceId,
        status: "NO_SHOW",
        scheduledAt: { gte: subDays(now, 7), lte: todayEnd }
      }
    }),
    db.appointment.findMany({
      where: {
        workspaceId,
        scheduledAt: { gte: now, lte: tomorrow },
        status: { in: ["SCHEDULED", "CONFIRMED"] }
      },
      include: {
        patient: true,
        doctor: {
          include: { profile: true }
        }
      },
      orderBy: { scheduledAt: "asc" },
      take: 6
    }),
    db.patient.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    db.task.findMany({
      where: buildTaskVisibilityWhere(workspaceId, { role: "RECEPTIONIST", userId }),
      include: {
        patient: true,
        assignee: {
          include: { profile: true }
        }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 6
    })
  ]);

  return {
    todayAppointments,
    checkedInToday,
    noShowsLastWeek,
    reminderQueue,
    recentPatients: recentPatients as ReceptionRecentPatient[],
    frontDeskTasks
  };
}

export async function getLabDashboard(workspaceId: string, userId: string) {
  const now = new Date();
  const todayStart = startOfDay(now);

  const [recentReports, failedReports, readyReports, processingReports, labTasks] = await Promise.all([
    db.document.findMany({
      where: {
        workspaceId,
        docType: { in: ["LAB_REPORT", "IMAGING"] }
      },
      include: {
        patient: true
      },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    db.document.count({
      where: {
        workspaceId,
        docType: { in: ["LAB_REPORT", "IMAGING"] },
        processingStatus: "FAILED"
      }
    }),
    db.document.count({
      where: {
        workspaceId,
        docType: { in: ["LAB_REPORT", "IMAGING"] },
        processingStatus: "READY",
        createdAt: { gte: todayStart }
      }
    }),
    db.document.count({
      where: {
        workspaceId,
        docType: { in: ["LAB_REPORT", "IMAGING"] },
        processingStatus: { in: ["UPLOADED", "PROCESSING"] }
      }
    }),
    db.task.findMany({
      where: buildTaskVisibilityWhere(workspaceId, { role: "LAB_STAFF", userId }),
      include: {
        assignee: {
          include: { profile: true }
        }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 6
    })
  ]);

  return {
    recentReports,
    failedReports,
    readyReports,
    processingReports,
    labTasks
  };
}

export async function getOperationsDashboard(workspaceId: string) {
  const analytics = await getWorkspaceAnalytics(workspaceId);
  const noShowCount = analytics.appointmentStatusDistribution.find((item) => item.status === "NO_SHOW")?._count ?? 0;

  const [agingTasks, departmentLoad] = await Promise.all([
    db.task.findMany({
      where: {
        workspaceId,
        status: { not: "COMPLETED" }
      },
      include: {
        assignee: {
          include: { profile: true }
        }
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 8
    }),
    db.department.findMany({
      where: { workspaceId },
      include: {
        memberships: {
          where: { status: "ACTIVE" }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  return {
    analytics,
    noShowCount,
    agingTasks,
    departmentLoad: departmentLoad.map((department) => ({
      id: department.id,
      name: department.name,
      memberCount: department.memberships.length
    }))
  };
}
