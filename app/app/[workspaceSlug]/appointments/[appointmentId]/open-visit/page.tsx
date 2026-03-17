import { redirect } from "next/navigation";
import { ensureVisitForAppointment } from "@/features/appointments/service";
import { requireWorkspaceContext } from "@/lib/auth/session";

export default async function OpenVisitRedirectPage({ params }: { params: Promise<{ workspaceSlug: string; appointmentId: string }> }) {
  const { workspaceSlug, appointmentId } = await params;
  const { workspace, viewer } = await requireWorkspaceContext(workspaceSlug, "visits:write");
  const visit = await ensureVisitForAppointment(workspace.id, appointmentId, viewer);

  redirect(`/app/${workspaceSlug}/visits/${visit.id}?scan=doctor`);
}
