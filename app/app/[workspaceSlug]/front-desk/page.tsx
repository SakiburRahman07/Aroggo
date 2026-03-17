import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getReceptionDashboard, type ReceptionRecentPatient } from "@/features/dashboard/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { getDefaultDashboardRoute } from "@/lib/security/navigation";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export default async function FrontDeskDashboardPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["appointments:read", "patients:write_basic"]);

  if (membership.role !== "RECEPTIONIST") {
    redirect(getDefaultDashboardRoute(membership.role, workspaceSlug));
  }

  const dashboard = await getReceptionDashboard(workspace.id, membership.userId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Front desk"
        title="Reception operations"
        description="Keep intake, reminders, check-ins, and no-show follow-up moving without leaving the front-desk workflow."
        actions={
          <div className="flex gap-3">
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/patients/new`}>Register patient</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/appointments/new`}>Book appointment</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/scan`}>Scan QR</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Appointments today" value={dashboard.todayAppointments.length} />
        <StatCard label="Checked in" value={dashboard.checkedInToday} tone="success" />
        <StatCard label="Reminder queue" value={dashboard.reminderQueue.length} />
        <StatCard label="No-shows (7d)" value={dashboard.noShowsLastWeek} tone="warning" />
        <StatCard label="Front desk tasks" value={dashboard.frontDeskTasks.length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Check-in board</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.todayAppointments.map((appointment) => (
              <div key={appointment.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{appointment.patient.fullName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.doctor.profile?.fullName ?? appointment.doctor.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{formatDateTime(appointment.scheduledAt)}</p>
                    <p>{appointment.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.reminderQueue.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{appointment.patient.fullName}</p>
                  <p className="text-muted-foreground">{formatDateTime(appointment.scheduledAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent registrations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.recentPatients.map((patient: ReceptionRecentPatient) => (
                <Link key={patient.id} href={`/app/${workspaceSlug}/patients/${patient.id}`} className="block rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{patient.fullName}</p>
                  <p className="text-muted-foreground">{patient.phone}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Front-desk tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.frontDeskTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{task.title}</p>
                  {task.dueAt ? <p className="text-muted-foreground">Due {formatRelativeTime(task.dueAt)}</p> : <p className="text-muted-foreground">No due date</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
