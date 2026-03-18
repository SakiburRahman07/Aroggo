import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buildActivePatientContext } from "@/features/workflow/service";
import { workflowStateLabels, workflowStateVariant } from "@/features/workflow/presenter";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export default async function OperationsPatientWorkflowPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["patients:read_basic_limited", "analytics:read_operational"]);
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
        eyebrow="Operations Patient Context"
        title={context.patient.fullName}
        description="Queue-safe operational view of patient stage, blockers, and current throughput state."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Current stage</p><div className="mt-3"><Badge variant={workflowStateVariant(context.currentWorkflowState)}>{workflowStateLabels[context.currentWorkflowState]}</Badge></div></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active appointment</p><p className="mt-2 text-lg font-semibold text-slate-950">{context.activeAppointment ? formatDateTime(context.activeAppointment.scheduledAt) : "None"}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Open lab orders</p><p className="mt-2 text-lg font-semibold text-slate-950">{context.labOrders.filter((order) => order.status !== "RELEASED_TO_PATIENT" && order.status !== "CANCELLED").length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Outstanding blockers</p><p className="mt-2 text-lg font-semibold text-slate-950">{context.blockers.length}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader><CardTitle>Operational status</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-muted-foreground">Current workflow recommendation</p>
              <p className="mt-2 font-medium text-slate-950">{context.recommendedNextRoute.label}</p>
              <p className="mt-1 text-muted-foreground">{context.recommendedNextRoute.description}</p>
            </div>
            <div className="rounded-2xl border border-border/70 p-4">
              <p className="text-muted-foreground">Active appointment reason</p>
              <p className="mt-2 font-medium text-slate-950">{context.activeAppointment?.reason ?? "No active appointment"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Blockers</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {context.blockers.length > 0 ? context.blockers.map((blocker) => (
              <div key={blocker} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{blocker}</div>
            )) : <p className="text-muted-foreground">No operational blockers detected.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
