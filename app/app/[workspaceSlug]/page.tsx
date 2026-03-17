import { redirect } from "next/navigation";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { getDefaultDashboardRoute } from "@/lib/security/navigation";

export default async function WorkspaceEntryPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { membership } = await requireWorkspaceContext(workspaceSlug);

  redirect(getDefaultDashboardRoute(membership.role, workspaceSlug));
}