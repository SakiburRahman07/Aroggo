import crypto from "node:crypto";
import { db } from "@/lib/db/prisma";
import { roleLabels } from "@/lib/security/permissions";
import { inviteMemberSchema, workspaceSettingsSchema } from "@/features/workspace/validation";
import { sendWorkspaceInvite } from "@/features/auth/service";

export async function getWorkspaceTeamSnapshot(workspaceId: string) {
  const [members, invites, departments] = await Promise.all([
    db.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          include: {
            profile: true
          }
        },
        department: true
      },
      orderBy: { createdAt: "asc" }
    }),
    db.workspaceInvite.findMany({
      where: { workspaceId, status: "PENDING" },
      include: {
        department: true
      },
      orderBy: { createdAt: "desc" }
    }),
    db.department.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" }
    })
  ]);

  return {
    members,
    invites,
    departments
  };
}

export async function listWorkspaceStaff(workspaceId: string) {
  return db.membership.findMany({
    where: {
      workspaceId,
      status: "ACTIVE"
    },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

export async function createWorkspaceInvite(params: {
  workspaceId: string;
  workspaceName: string;
  invitedById: string;
  inviterName: string;
  input: unknown;
}) {
  const data = inviteMemberSchema.parse(params.input);
  const existingMembership = await db.membership.findFirst({
    where: {
      workspaceId: params.workspaceId,
      user: {
        email: data.email.toLowerCase()
      }
    }
  });

  if (existingMembership) {
    throw new Error("This user is already a member of the workspace.");
  }

  await db.workspaceInvite.updateMany({
    where: {
      workspaceId: params.workspaceId,
      email: data.email.toLowerCase(),
      status: "PENDING"
    },
    data: {
      status: "REVOKED"
    }
  });

  const invite = await db.workspaceInvite.create({
    data: {
      workspaceId: params.workspaceId,
      email: data.email.toLowerCase(),
      token: crypto.randomBytes(24).toString("hex"),
      role: data.role,
      departmentId: data.departmentId,
      invitedById: params.invitedById,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
    }
  });

  await sendWorkspaceInvite({
    workspaceId: params.workspaceId,
    workspaceName: params.workspaceName,
    recipient: invite.email,
    inviterName: params.inviterName,
    roleLabel: roleLabels[invite.role],
    acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?invite=${invite.token}`
  });

  return invite;
}

export async function updateWorkspaceSettings(workspaceId: string, input: unknown) {
  const data = workspaceSettingsSchema.parse(input);

  return db.workspace.update({
    where: { id: workspaceId },
    data: {
      name: data.name,
      timezone: data.timezone
    }
  });
}
