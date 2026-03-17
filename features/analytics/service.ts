import { startOfDay, endOfDay, addDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";

export type AnalyticsAppointmentStatusItem = Prisma.PromiseReturnType<typeof db.appointment.groupBy>[number];
export type AnalyticsProcessingStatusItem = Prisma.PromiseReturnType<typeof db.document.groupBy>[number];
export type AnalyticsDoctorWorkloadItem = {
  doctorId: string;
  name: string;
  appointmentsToday: number;
};

export type WorkspaceAnalyticsSnapshot = {
  appointmentsToday: number;
  appointmentStatusDistribution: AnalyticsAppointmentStatusItem[];
  overdueTasks: number;
  followUps: number;
  recentUploads: Awaited<ReturnType<typeof db.document.findMany>>;
  processingDistribution: AnalyticsProcessingStatusItem[];
  aiUsage: number;
  doctorWorkload: AnalyticsDoctorWorkloadItem[];
};

export async function getWorkspaceAnalytics(workspaceId: string): Promise<WorkspaceAnalyticsSnapshot> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const nextWeek = addDays(now, 7);

  const [appointmentsToday, appointmentStatusDistribution, overdueTasks, followUps, recentUploads, processingDistribution, aiUsage, doctors] =
    await Promise.all([
      db.appointment.count({
        where: {
          workspaceId,
          scheduledAt: { gte: todayStart, lte: todayEnd }
        }
      }),
      db.appointment.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: true
      }),
      db.task.count({
        where: {
          workspaceId,
          dueAt: { lt: now },
          status: { not: "COMPLETED" }
        }
      }),
      db.visit.count({
        where: {
          workspaceId,
          followUpDate: { lte: nextWeek }
        }
      }),
      db.document.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      db.document.groupBy({
        by: ["processingStatus"],
        where: { workspaceId },
        _count: true
      }),
      db.aIQuery.count({
        where: {
          workspaceId,
          createdAt: { gte: todayStart }
        }
      }),
      db.membership.findMany({
        where: {
          workspaceId,
          role: "DOCTOR",
          status: "ACTIVE"
        },
        include: {
          user: {
            include: { profile: true }
          }
        }
      })
    ]);

  const doctorWorkload: AnalyticsDoctorWorkloadItem[] = await Promise.all(
    doctors.map(async (membership) => {
      const upcomingAppointments = await db.appointment.count({
        where: {
          workspaceId,
          doctorUserId: membership.userId,
          scheduledAt: { gte: todayStart, lte: todayEnd }
        }
      });

      return {
        doctorId: membership.userId,
        name: membership.user.profile?.fullName ?? membership.user.name ?? membership.user.email,
        appointmentsToday: upcomingAppointments
      };
    })
  );

  return {
    appointmentsToday,
    appointmentStatusDistribution,
    overdueTasks,
    followUps,
    recentUploads,
    processingDistribution,
    aiUsage,
    doctorWorkload
  };
}
