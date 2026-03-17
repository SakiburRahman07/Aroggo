"use server";

import { revalidatePath } from "next/cache";
import { createWorkspaceInvite, updateWorkspaceSettings } from "@/features/workspace/service";
import { recordAuditLog } from "@/lib/audit";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function inviteWorkspaceMemberAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "members:manage");

  await createWorkspaceInvite({
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    invitedById: membership.userId,
    inviterName: membership.user.profile?.fullName ?? membership.user.name ?? membership.user.email,
    input: {
      email: formData.get("email"),
      role: formData.get("role"),
      departmentId: formData.get("departmentId") || undefined
    }
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "workspace_invite",
    entityId: workspace.id,
    action: "INVITE"
  });

  revalidatePath(`/app/${workspaceSlug}/team`);
}

export async function updateWorkspaceSettingsAction(workspaceSlug: string, formData: FormData) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "workspace:manage");

  await updateWorkspaceSettings(workspace.id, {
    name: formData.get("name"),
    timezone: formData.get("timezone")
  });

  await recordAuditLog({
    workspaceId: workspace.id,
    actorUserId: membership.userId,
    entityType: "workspace",
    entityId: workspace.id,
    action: "UPDATE"
  });

  revalidatePath(`/app/${workspaceSlug}/settings`);
  revalidatePath(`/app/${workspaceSlug}`);
}

