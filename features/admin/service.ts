import { startOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db/prisma";

type WorkspaceHealthBase = Prisma.WorkspaceGetPayload<{
  include: {
    creator: {
      include: { profile: true };
    };
    _count: {
      select: {
        memberships: true;
        documents: true;
        patients: true;
        appointments: true;
      };
    };
  };
}>;

export type PlatformWorkspaceHealth = WorkspaceHealthBase & {
  failedDocs: number;
  pendingInvites: number;
  aiQueries: number;
};

export type PlatformAdminSnapshot = {
  stats: {
    workspaceCount: number;
    activeMemberships: number;
    pendingDocuments: number;
    failedDocuments: number;
    failedEmails: number;
    aiQueriesToday: number;
  };
  workspaceHealth: PlatformWorkspaceHealth[];
  recentEmails: Awaited<ReturnType<typeof db.emailLog.findMany>>;
  recentAuditLogs: Awaited<ReturnType<typeof db.auditLog.findMany>>;
  recentUsers: Awaited<ReturnType<typeof db.user.findMany>>;
};

export async function getPlatformAdminSnapshot(): Promise<PlatformAdminSnapshot> {
  const todayStart = startOfDay(new Date());
  const [
    workspaceCount,
    activeMemberships,
    pendingDocuments,
    failedDocuments,
    failedEmails,
    aiQueriesToday,
    workspaceHealthBase,
    recentEmails,
    recentAuditLogs,
    recentUsers
  ] = await Promise.all([
    db.workspace.count(),
    db.membership.count({ where: { status: "ACTIVE" } }),
    db.document.count({ where: { processingStatus: { in: ["UPLOADED", "PROCESSING"] } } }),
    db.document.count({ where: { processingStatus: "FAILED" } }),
    db.emailLog.count({ where: { status: "FAILED" } }),
    db.aIQuery.count({ where: { createdAt: { gte: todayStart } } }),
    db.workspace.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        creator: {
          include: { profile: true }
        },
        _count: {
          select: {
            memberships: true,
            documents: true,
            patients: true,
            appointments: true
          }
        }
      }
    }),
    db.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        profile: true,
        memberships: {
          where: { status: "ACTIVE" },
          include: { workspace: true }
        }
      }
    })
  ]);

  const workspaceHealth: PlatformWorkspaceHealth[] = await Promise.all(
    workspaceHealthBase.map(async (workspace) => {
      const [failedDocs, pendingInvites, aiQueries] = await Promise.all([
        db.document.count({
          where: {
            workspaceId: workspace.id,
            processingStatus: "FAILED"
          }
        }),
        db.workspaceInvite.count({
          where: {
            workspaceId: workspace.id,
            status: "PENDING"
          }
        }),
        db.aIQuery.count({
          where: {
            workspaceId: workspace.id,
            createdAt: { gte: todayStart }
          }
        })
      ]);

      return {
        ...workspace,
        failedDocs,
        pendingInvites,
        aiQueries
      };
    })
  );

  return {
    stats: {
      workspaceCount,
      activeMemberships,
      pendingDocuments,
      failedDocuments,
      failedEmails,
      aiQueriesToday
    },
    workspaceHealth,
    recentEmails,
    recentAuditLogs,
    recentUsers
  };
}
