import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { buildActivePatientContext } from "@/features/workflow/service";
import { createLabOrderAction, movePatientWorkflowAction } from "@/features/workflow/actions";
import { workflowStateLabels, workflowStateVariant } from "@/features/workflow/presenter";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function DoctorPatientWorkflowPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["patients:read_clinical", "visits:read"]);
  const context = await buildActivePatientContext({
    workspaceId: workspace.id,
    patientId,
    role: membership.role,
    userId: membership.userId,
    resolvedFrom: "search"
  });

  const appointmentId = context.activeAppointmentId;
  const startConsultationAction = appointmentId ? movePatientWorkflowAction.bind(null, workspaceSlug, patientId, appointmentId, "IN_CONSULTATION") : null;
  const reviewAction = appointmentId ? movePatientWorkflowAction.bind(null, workspaceSlug, patientId, appointmentId, "REVIEWED") : null;
  const orderLabAction = createLabOrderAction.bind(null, workspaceSlug, patientId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Doctor Encounter Workspace"
        title={context.patient.fullName}
        description={`${context.patient.patientCode}  -  ${context.patient.phone}  -  Continue consultation, review history, order tests, and publish patient-safe outputs.`}
        actions={
          <div className="flex gap-3">
            {context.activeVisitId ? (
              <Button asChild>
                <Link href={`/app/${workspaceSlug}/visits/${context.activeVisitId}`}>Open visit note</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/documents?patientId=${patientId}`}>Review reports</Link>
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
              {context.activeAppointment ? <Badge variant="outline">Appointment active</Badge> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Active appointment</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.activeAppointment ? formatDateTime(context.activeAppointment.scheduledAt) : "No appointment today"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Open visit</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.activeVisit ? formatDate(context.activeVisit.createdAt) : "Not started"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Open lab orders</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.labOrders.filter((order) => order.status !== "RELEASED_TO_PATIENT" && order.status !== "CANCELLED").length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Encounter continuation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {context.activeAppointment ? (
                <div className="rounded-3xl border border-border/70 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline">{workflowStateLabels[context.activeAppointment.flowState]}</Badge>
                    <Badge variant="outline">{context.activeAppointment.status}</Badge>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-950">{context.activeAppointment.reason}</p>
                  <p className="mt-2 text-muted-foreground">Scheduled {formatDateTime(context.activeAppointment.scheduledAt)}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {startConsultationAction ? (
                      <form action={startConsultationAction}><Button type="submit">Start consultation</Button></form>
                    ) : null}
                    {reviewAction ? (
                      <form action={reviewAction}><Button type="submit" variant="outline">Mark doctor review complete</Button></form>
                    ) : null}
                    {context.activeVisitId ? (
                      <Button asChild variant="outline"><Link href={`/app/${workspaceSlug}/visits/${context.activeVisitId}`}>Write prescription</Link></Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border p-5 text-muted-foreground">
                  No active appointment is linked right now. Use this page as a clinical summary and prior-record review surface.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinical summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {context.activeVisit ? (
                <div className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">Current encounter note</p>
                  <p className="mt-2 text-muted-foreground">Symptoms: {context.activeVisit.symptoms ?? "Not recorded"}</p>
                  <p className="text-muted-foreground">Observations: {context.activeVisit.observations ?? "Not recorded"}</p>
                  <p className="text-muted-foreground">Assessment: {context.activeVisit.diagnosisNote ?? "Not recorded"}</p>
                  <p className="text-muted-foreground">Prescription: {context.activeVisit.prescriptionText ?? "Not recorded"}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No active visit note exists yet. Starting consultation will create one if needed.</p>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {context.previousVisits.slice(0, 4).map((visit) => (
                  <div key={visit.id} className="rounded-2xl border border-border/70 p-4">
                    <p className="font-medium text-slate-950">{formatDate(visit.createdAt)}</p>
                    <p className="mt-1 text-muted-foreground">{visit.doctorName}</p>
                    <p className="mt-2 text-muted-foreground">Assessment: {visit.diagnosisNote ?? "Not recorded"}</p>
                    <p className="text-muted-foreground">Prescription: {visit.prescriptionText ?? "Not recorded"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order tests</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={orderLabAction} className="space-y-4">
                <input type="hidden" name="appointmentId" value={context.activeAppointmentId ?? ""} />
                <input type="hidden" name="visitId" value={context.activeVisitId ?? ""} />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Test name</label>
                  <Input name="testName" placeholder="CBC, HbA1c, Chest X-ray" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Clinical indication</label>
                  <Textarea name="indication" placeholder="Reason for ordering the test" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Lab instructions</label>
                  <Textarea name="notes" placeholder="Optional notes for lab staff" />
                </div>
                <Button type="submit">Create lab order</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent reports and orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {context.labOrders.length > 0 ? context.labOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{order.testName}</p>
                    <Badge variant="outline">{order.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">Ordered {formatDateTime(order.orderedAt)}</p>
                  <p className="text-muted-foreground">{order.indication ?? "No indication recorded."}</p>
                </div>
              )) : <p className="text-muted-foreground">No lab orders exist for this patient yet.</p>}
              {context.recentReports.map((report) => (
                <Link key={report.id} href={`/app/${workspaceSlug}/documents/${report.id}`} className="block rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{report.title}</p>
                  <p className="mt-1 text-muted-foreground">{report.processingStatus}  -  {formatDateTime(report.createdAt)}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
