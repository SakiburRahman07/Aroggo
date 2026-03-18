import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buildActivePatientContext } from "@/features/workflow/service";
import { updateLabOrderStatusAction } from "@/features/workflow/actions";
import { workflowStateLabels, workflowStateVariant } from "@/features/workflow/presenter";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export default async function LabPatientWorkflowPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["documents:read_lab", "reports:upload"]);
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
        eyebrow="Lab Patient Context"
        title={context.patient.fullName}
        description={`${context.patient.patientCode} · ${context.patient.phone} · Match orders, upload results, and push cases toward doctor review.`}
        actions={
          <div className="flex gap-3">
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/documents?patientId=${patientId}&scan=lab`}>Upload report</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/patients/${patientId}`}>Open patient summary</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Workflow state</p>
            <div className="mt-3 flex items-center gap-3">
              <Badge variant={workflowStateVariant(context.currentWorkflowState)}>{workflowStateLabels[context.currentWorkflowState]}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Open lab orders</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.labOrders.filter((order) => order.status !== "RELEASED_TO_PATIENT" && order.status !== "CANCELLED").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Recent reports</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.recentReports.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Current route</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.recommendedNextRoute.label}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lab order workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {context.labOrders.length > 0 ? context.labOrders.map((order) => {
              const sampleCollectedAction = updateLabOrderStatusAction.bind(null, workspaceSlug, patientId, order.id, "SAMPLE_COLLECTED");
              const processingAction = updateLabOrderStatusAction.bind(null, workspaceSlug, patientId, order.id, "PROCESSING");
              const uploadedAction = updateLabOrderStatusAction.bind(null, workspaceSlug, patientId, order.id, "RESULT_UPLOADED");
              const reviewPendingAction = updateLabOrderStatusAction.bind(null, workspaceSlug, patientId, order.id, "DOCTOR_REVIEW_PENDING");

              return (
                <div key={order.id} className="rounded-3xl border border-border/70 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline">{order.status.replaceAll("_", " ")}</Badge>
                    {order.resultDocumentId ? <Badge variant="success">Result linked</Badge> : <Badge variant="warning">No result document linked yet</Badge>}
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-950">{order.testName}</p>
                  <p className="mt-2 text-muted-foreground">Ordered {formatDateTime(order.orderedAt)}</p>
                  <p className="mt-2 text-muted-foreground">{order.indication ?? "No indication recorded."}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <form action={sampleCollectedAction}><Button type="submit" variant="outline">Sample collected</Button></form>
                    <form action={processingAction}><Button type="submit" variant="outline">Mark processing</Button></form>
                    <form action={uploadedAction}><Button type="submit" variant="outline">Result uploaded</Button></form>
                    <form action={reviewPendingAction}><Button type="submit">Queue doctor review</Button></form>
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-3xl border border-dashed border-border p-5 text-muted-foreground">
                No active lab orders are attached to this patient. Use the report queue to upload a result or wait for a doctor order.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {context.recentReports.length > 0 ? context.recentReports.map((report) => (
                <Link key={report.id} href={`/app/${workspaceSlug}/documents/${report.id}`} className="block rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{report.title}</p>
                  <p className="mt-1 text-muted-foreground">{report.processingStatus} · {formatDateTime(report.createdAt)}</p>
                </Link>
              )) : <p className="text-muted-foreground">No patient-linked reports are visible in the lab scope.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blockers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {context.blockers.length > 0 ? context.blockers.map((blocker) => (
                <div key={blocker} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{blocker}</div>
              )) : <p className="text-muted-foreground">No lab blockers detected.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
