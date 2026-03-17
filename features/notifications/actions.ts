"use server";

import { revalidatePath } from "next/cache";
import { markAllNotificationsRead } from "@/features/notifications/service";
import { requireWorkspaceContext } from "@/lib/auth/session";

export async function markAllNotificationsReadAction(workspaceSlug: string) {
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "notifications:read");
  await markAllNotificationsRead(workspace.id, membership.userId);
  revalidatePath(`/app/${workspaceSlug}/notifications`);
}
