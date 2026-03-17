import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { quickCheckInFromScanAction } from "@/features/qr/actions";
import { buildPatientScanContext, type PatientScanContext } from "@/features/qr/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { appointmentStatusLabels, roleLabels } from "@/lib/security/permissions";
import { formatDateTime } from "@/lib/utils";

export default async function PatientScanContextPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug);
  let context: PatientScanContext;

  try {
    context = await buildPatientScanContext({
      workspaceId: workspace.id,
      patientId,
      role: membership.role,
      userId: membership.userId
    });
  } catch {
    return <div className="text-sm text-muted-foreground">This patient could not be opened in your current access scope.</div>;
  }
  const quickCheckInAction = context.activeAppointmentId
    ? quickCheckInFromScanAction.bind(null, workspaceSlug, context.activeAppointmentId)
    : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Active patient context"
        title={context.patient.fullName}
        description={`${context.patient.patientCode} - Resolved from secure QR for ${roleLabels[membership.role]}`}
        actions={
          <Button asChild>
            <Link href={context.recommendedWorkflow.href}>{context.recommendedWorkflow.label}</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommended continuation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl bg-muted/30 p-4 text-muted-foreground">
                <p>Patient ID: <span className="font-medium text-slate-950">{context.patient.patientCode}</span></p>
                <p>Phone: <span className="font-medium text-slate-950">{context.patient.phone}</span></p>
                <p>Resolved at: <span className="font-medium text-slate-950">{formatDateTime(context.timestamp)}</span></p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-white p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success">{roleLabels[membership.role]}</Badge>
                  {context.activeAppointmentId ? <Badge variant="outline">Appointment today</Badge> : <Badge variant="warning">No appointment today</Badge>}
                  {context.activeVisitId ? <Badge variant="default">Visit in progress</Badge> : null}
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-950">{context.recommendedWorkflow.label}</p>
                <p className="mt-2 text-muted-foreground">{context.recommendedWorkflow.description}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={context.recommendedWorkflow.href}>Continue workflow</Link>
                  </Button>
                  {membership.role === "RECEPTIONIST" && quickCheckInAction ? (
                    <form action={quickCheckInAction}>
                      <Button type="submit" variant="outline">Check in now</Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {context.quickActions.map((action) => (
                <Link key={`${action.label}-${action.href}`} href={action.href} className="rounded-2xl border border-border/70 p-4 transition hover:-translate-y-0.5 hover:bg-slate-50">
                  <p className="font-medium text-slate-950">{action.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's appointment context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {context.todayAppointments.length > 0 ? context.todayAppointments.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-950">{appointment.reason}</p>
                    <Badge variant="outline">{appointmentStatusLabels[appointment.status]}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{formatDateTime(appointment.scheduledAt)} with {appointment.doctorName}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                      <Link href={`/app/${workspaceSlug}/appointments/${appointment.id}?scan=qr`}>Open appointment</Link>
                    </Button>
                    {appointment.visitId ? (
                      <Button asChild variant="outline">
                        <Link href={`/app/${workspaceSlug}/visits/${appointment.visitId}?scan=doctor`}>Open visit</Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              )) : <p className="text-muted-foreground">No active appointments were found for today.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent reports and tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <p className="font-medium text-slate-950">Recent reports</p>
                {context.recentReports.length > 0 ? context.recentReports.map((report) => (
                  <Link key={report.id} href={`/app/${workspaceSlug}/documents/${report.id}?scan=qr`} className="block rounded-2xl border border-border/70 p-4">
                    <p className="font-medium text-slate-950">{report.title}</p>
                    <p className="text-muted-foreground">{report.processingStatus} - {formatDateTime(report.createdAt)}</p>
                  </Link>
                )) : <p className="text-muted-foreground">No role-visible reports were found for this patient.</p>}
              </div>
              <div className="space-y-3">
                <p className="font-medium text-slate-950">Role-relevant tasks</p>
                {context.roleRelevantTasks.length > 0 ? context.roleRelevantTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                    <p className="font-medium text-slate-950">{task.title}</p>
                    <p className="text-muted-foreground">{task.status}</p>
                  </div>
                )) : <p className="text-muted-foreground">No immediate tasks are attached to this patient in your scope.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

