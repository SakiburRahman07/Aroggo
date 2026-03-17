import { type AuditAction } from "@prisma/client";
import { db } from "@/lib/db/prisma";

interface RecordAuditLogParams {
  workspaceId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  changesJson?: unknown;
}

export async function recordAuditLog(params: RecordAuditLogParams) {
  return db.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changesJson: params.changesJson as never
    }
  });
}

