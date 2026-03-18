import { openVisitFromAppointmentAction, updateAppointmentStatusAction } from "@/features/appointments/actions";
import { getAppointmentDetail, type AppointmentDetail } from "@/features/appointments/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { appointmentReadPermissions, appointmentStatusLabels } from "@/lib/security/permissions";
import { getScopedAppointmentAccess, getScopedVisitAccess } from "@/lib/security/scopes";
import { formatDateTime } from "@/lib/utils";

const statusOptions = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

type AppointmentTask = AppointmentDetail["tasks"][number];

export default async function AppointmentDetailPage({ params, searchParams }: { params: Promise<{ workspaceSlug: string; appointmentId: string }>; searchParams: Promise<{ error?: string }> }) {
  const { workspaceSlug, appointmentId } = await params;
  const { error } = await searchParams;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, appointmentReadPermissions);
  const appointmentAccess = getScopedAppointmentAccess(membership.role);
  const visitAccess = getScopedVisitAccess(membership.role);
  const appointment = await getAppointmentDetail(workspace.id, appointmentId, viewer);

  if (!appointment) {
    return <div className="text-sm text-muted-foreground">Appointment not found.</div>;
  }

  const statusAction = updateAppointmentStatusAction.bind(null, workspaceSlug, appointment.id);
  const openVisitAction = openVisitFromAppointmentAction.bind(null, workspaceSlug, appointment.id);

  return (
    <div className="space-y-8">
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <PageHeader eyebrow="Appointment detail" title={appointment.patient.fullName} description={`${appointment.reason} - ${formatDateTime(appointment.scheduledAt)}`} />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>Status and schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Doctor: <span className="font-medium text-slate-950">{appointment.doctor.profile?.fullName ?? appointment.doctor.email}</span></p>
              <p>Status: <span className="font-medium text-slate-950">{appointmentStatusLabels[appointment.status]}</span></p>
              <p>Duration: <span className="font-medium text-slate-950">{appointment.durationMinutes} minutes</span></p>
            </div>
            {appointmentAccess.canWrite ? (
              <form action={statusAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Update status</label>
                  <Select name="status" defaultValue={appointment.status}>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{appointmentStatusLabels[status]}</option>
                    ))}
                  </Select>
                </div>
                <Button type="submit">Save status</Button>
              </form>
            ) : null}
            {visitAccess.write ? (
              <form action={openVisitAction}>
                <Button type="submit" variant="outline">{appointment.visit ? "Open linked visit" : "Start visit note"}</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Linked work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {appointment.tasks.length > 0 ? (
              appointment.tasks.map((task: AppointmentTask) => (
                <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{task.title}</p>
                  <p className="text-muted-foreground">{task.status} - {task.assignee?.profile?.fullName ?? task.assignee?.email ?? "Unassigned"}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No tasks linked to this appointment yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



