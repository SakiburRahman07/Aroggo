import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { buildActivePatientContext } from "@/features/workflow/service";
import { movePatientWorkflowAction } from "@/features/workflow/actions";
import { workflowStateLabels, workflowStateVariant } from "@/features/workflow/presenter";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function FrontDeskPatientWorkflowPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["appointments:read", "patients:write_basic"]);
  const context = await buildActivePatientContext({
    workspaceId: workspace.id,
    patientId,
    role: membership.role,
    userId: membership.userId,
    resolvedFrom: "search"
  });

  const appointmentId = context.activeAppointmentId;
  const markArrivedAction = appointmentId ? movePatientWorkflowAction.bind(null, workspaceSlug, patientId, appointmentId, "ARRIVED") : null;
  const readyForProviderAction = appointmentId ? movePatientWorkflowAction.bind(null, workspaceSlug, patientId, appointmentId, "READY_FOR_PROVIDER") : null;
  const checkoutAction = appointmentId ? movePatientWorkflowAction.bind(null, workspaceSlug, patientId, appointmentId, "CHECKED_OUT") : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Front Desk Patient Context"
        title={context.patient.fullName}
        description={`${context.patient.patientCode} · ${context.patient.phone} · Continue intake, check-in, and handoff from one front-desk workflow.`}
        actions={
          <div className="flex gap-3">
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/appointments/new?patientId=${patientId}`}>Book follow-up</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/patients/${patientId}`}>Open profile</Link>
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
              {context.patient.portalEnabled ? <Badge variant="outline">Portal enabled</Badge> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Today&apos;s appointment</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.activeAppointment ? formatDateTime(context.activeAppointment.scheduledAt) : "No appointment today"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Current route</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.recommendedNextRoute.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Blockers</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{context.blockers.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Arrival and intake workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {context.activeAppointment ? (
                <div className="rounded-3xl border border-border/70 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline">{workflowStateLabels[context.activeAppointment.flowState]}</Badge>
                    <Badge variant="outline">{context.activeAppointment.status}</Badge>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-950">{context.activeAppointment.reason}</p>
                  <p className="mt-2 text-muted-foreground">{formatDateTime(context.activeAppointment.scheduledAt)} with {context.activeAppointment.doctorName}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    {markArrivedAction ? (
                      <form action={markArrivedAction}><Button type="submit">Check in</Button></form>
                    ) : null}
                    {readyForProviderAction ? (
                      <form action={readyForProviderAction}><Button type="submit" variant="outline">Send to provider queue</Button></form>
                    ) : null}
                    {checkoutAction ? (
                      <form action={checkoutAction}><Button type="submit" variant="outline">Check out</Button></form>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border p-5 text-muted-foreground">
                  No active appointment exists for today. Use this surface for walk-in registration, demographic verification, or follow-up booking.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demographic verification</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-muted-foreground">Phone</p>
                <p className="mt-1 font-medium text-slate-950">{context.patient.phone}</p>
              </div>
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-muted-foreground">Email</p>
                <p className="mt-1 font-medium text-slate-950">{context.patient.email ?? "Not recorded"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-muted-foreground">Date of birth</p>
                <p className="mt-1 font-medium text-slate-950">{context.patient.dob ? formatDate(context.patient.dob) : "Not recorded"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-muted-foreground">Portal status</p>
                <p className="mt-1 font-medium text-slate-950">{context.patient.adminState.replaceAll("_", " ")}</p>
              </div>
              <div className="md:col-span-2">
                <Button asChild variant="outline">
                  <Link href={`/app/${workspaceSlug}/patients/${patientId}`}>Update demographics</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommended quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {context.recommendedQuickActions.map((action) => (
                <Link key={action.key} href={action.href} className="block rounded-2xl border border-border/70 p-4 transition hover:-translate-y-0.5 hover:bg-slate-50">
                  <p className="font-medium text-slate-950">{action.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Front-desk blockers and next steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {context.blockers.length > 0 ? context.blockers.map((blocker) => (
                <div key={blocker} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{blocker}</div>
              )) : <p className="text-muted-foreground">No front-desk blockers detected. This patient can move forward.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {context.recentAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{appointment.reason}</p>
                    <Badge variant="outline">{workflowStateLabels[appointment.flowState]}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{formatDateTime(appointment.scheduledAt)} with {appointment.doctorName}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
