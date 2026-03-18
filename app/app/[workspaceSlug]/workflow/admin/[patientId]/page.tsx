import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buildActivePatientContext } from "@/features/workflow/service";
import { workflowStateLabels, workflowStateVariant } from "@/features/workflow/presenter";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export default async function AdminPatientWorkflowPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["patients:read_clinical", "audit:read"]);
  const context = await buildActivePatientContext({
    workspaceId: workspace.id,
    patientId,
    role: membership.role,
    userId: membership.userId,
    resolvedFrom: "search"
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Clinic Admin Patient View"
        title={context.patient.fullName}
        description="Clinic-wide workflow oversight with release-state visibility and role-aware patient progression."
        actions={
          <div className="flex gap-3">
            <Button asChild><Link href={`/app/${workspaceSlug}/patients/${patientId}`}>Open full patient profile</Link></Button>
            <Button asChild variant="outline"><Link href={`/app/${workspaceSlug}/documents?patientId=${patientId}`}>Review documents</Link></Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Current stage</p><div className="mt-3"><Badge variant={workflowStateVariant(context.currentWorkflowState)}>{workflowStateLabels[context.currentWorkflowState]}</Badge></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active appointment</p><p className="mt-2 text-lg font-semibold text-slate-950">{context.activeAppointment ? formatDateTime(context.activeAppointment.scheduledAt) : "None"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Lab orders</p><p className="mt-2 text-lg font-semibold text-slate-950">{context.labOrders.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Reports visible</p><p className="mt-2 text-lg font-semibold text-slate-950">{context.recentReports.length}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader><CardTitle>Workflow oversight</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-muted-foreground">Recommended route</p>
              <p className="mt-2 font-medium text-slate-950">{context.recommendedNextRoute.label}</p>
              <p className="mt-1 text-muted-foreground">{context.recommendedNextRoute.description}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-muted-foreground">Portal admin state</p>
              <p className="mt-2 font-medium text-slate-950">{context.patient.adminState.replaceAll("_", " ")}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-muted-foreground">Visible blockers</p>
              <p className="mt-2 font-medium text-slate-950">{context.blockers.length > 0 ? context.blockers.join(" ") : "No major blockers detected."}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {context.recommendedQuickActions.map((action) => (
              <Link key={action.key} href={action.href} className="block rounded-2xl border border-border/70 p-4">
                <p className="font-medium text-slate-950">{action.label}</p>
                <p className="mt-1 text-muted-foreground">{action.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
