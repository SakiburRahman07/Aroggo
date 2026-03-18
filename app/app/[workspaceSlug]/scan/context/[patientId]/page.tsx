import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buildPatientScanContext } from "@/features/qr/service";
import { workflowStateLabels, workflowStateVariant } from "@/features/workflow/presenter";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export default async function PatientScanContextPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug);
  const context = await buildPatientScanContext({
    workspaceId: workspace.id,
    patientId,
    role: membership.role,
    userId: membership.userId
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Active Patient Context"
        title={context.patient.fullName}
        description={`${context.patient.patientCode}  -  Resolved from secure QR for ${membership.role.replaceAll("_", " ")}`}
        actions={
          <Button asChild>
            <Link href={context.recommendedNextRoute.href}>Continue workflow</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader><CardTitle>Recommended continuation</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl bg-muted/30 p-4 text-muted-foreground">
              <p>Phone: <span className="font-medium text-slate-950">{context.patient.phone}</span></p>
              <p>Resolved at: <span className="font-medium text-slate-950">{formatDateTime(context.timestamp)}</span></p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={workflowStateVariant(context.currentWorkflowState)}>{workflowStateLabels[context.currentWorkflowState]}</Badge>
                {context.activeAppointmentId ? <Badge variant="outline">Appointment active</Badge> : <Badge variant="warning">No appointment today</Badge>}
                {context.activeVisitId ? <Badge variant="default">Visit in progress</Badge> : null}
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-950">{context.recommendedNextRoute.label}</p>
              <p className="mt-2 text-muted-foreground">{context.recommendedNextRoute.description}</p>
              <div className="mt-5">
                <Button asChild>
                  <Link href={context.recommendedNextRoute.href}>Continue workflow</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {context.recommendedQuickActions.map((action) => (
              <Link key={action.key} href={action.href} className="block rounded-2xl border border-border/70 p-4 transition hover:-translate-y-0.5 hover:bg-slate-50">
                <p className="font-medium text-slate-950">{action.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
