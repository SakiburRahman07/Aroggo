import { openVisitFromAppointmentAction, updateAppointmentStatusAction } from "@/features/appointments/actions";
import { getAppointmentDetail } from "@/features/appointments/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { appointmentStatusLabels } from "@/lib/security/permissions";
import { formatDateTime } from "@/lib/utils";

const statusOptions = ["SCHEDULED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export default async function AppointmentDetailPage({ params }: { params: Promise<{ workspaceSlug: string; appointmentId: string }> }) {
  const { workspaceSlug, appointmentId } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "appointments:read");
  const appointment = await getAppointmentDetail(workspace.id, appointmentId);

  if (!appointment) {
    return <div className="text-sm text-muted-foreground">Appointment not found.</div>;
  }

  const statusAction = updateAppointmentStatusAction.bind(null, workspaceSlug, appointment.id);
  const openVisitAction = openVisitFromAppointmentAction.bind(null, workspaceSlug, appointment.id, appointment.doctorUserId, appointment.patientId);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Appointment detail" title={appointment.patient.fullName} description={`${appointment.reason} • ${formatDateTime(appointment.scheduledAt)}`} />
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
            <form action={openVisitAction}>
              <Button type="submit" variant="outline">{appointment.visit ? "Open linked visit" : "Start visit note"}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Linked work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {appointment.tasks.length > 0 ? (
              appointment.tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{task.title}</p>
                  <p className="text-muted-foreground">{task.status} • {task.assignee?.profile?.fullName ?? task.assignee?.email ?? "Unassigned"}</p>
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
