import { redirect } from "next/navigation";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { buildActivePatientContext } from "@/features/workflow/service";

export default async function WorkflowPatientResolverPage({
  params,
  searchParams
}: {
  params: Promise<{ workspaceSlug: string; patientId: string }>;
  searchParams: Promise<{ resolvedFrom?: "qr" | "search" | "schedule" | "portal"; intent?: "default" | "check_in" | "visit" | "report_upload" | "patient_summary" }>;
}) {
  const { workspaceSlug, patientId } = await params;
  const { resolvedFrom = "search", intent = "default" } = await searchParams;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug);

  const context = await buildActivePatientContext({
    workspaceId: workspace.id,
    patientId,
    role: membership.role,
    userId: membership.userId,
    resolvedFrom,
    intent
  });

  redirect(`${context.recommendedNextRoute.href}?resolvedFrom=${resolvedFrom}`);
}
