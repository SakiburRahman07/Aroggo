import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { generateOperationalSummary } from "@/features/ai/service";
import { getClinicAdminDashboard } from "@/features/dashboard/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { getDefaultDashboardRoute } from "@/lib/security/navigation";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export default async function ClinicOverviewPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["analytics:read_operational", "analytics:read_clinical"]);

  if (!["CLINIC_ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
    redirect(getDefaultDashboardRoute(membership.role, workspaceSlug));
  }

  const dashboard = await getClinicAdminDashboard(workspace.id);
  const summary = await generateOperationalSummary(workspace.id, membership.userId, dashboard.analytics);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Clinic command center" title="Clinic overview" description="Run the workspace from one role-aware dashboard covering throughput, staffing, and backlog." />
      <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Operational summary</p>
        <p className="mt-3 max-w-4xl text-base leading-7 text-muted-foreground">{summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Appointments today" value={dashboard.analytics.appointmentsToday} />
        <StatCard label="Active patients" value={dashboard.activePatients} />
        <StatCard label="Active members" value={dashboard.activeMembers} />
        <StatCard label="Open invites" value={dashboard.openInvites} />
        <StatCard label="Overdue tasks" value={dashboard.analytics.overdueTasks} tone="warning" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s clinic schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{appointment.patient.fullName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{formatDateTime(appointment.scheduledAt)}</p>
                    <p>{appointment.doctor.profile?.fullName ?? appointment.doctor.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Priority tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.priorityTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{task.title}</p>
                  <p className="text-muted-foreground">{task.assignee?.profile?.fullName ?? task.assignee?.email ?? "Unassigned"}</p>
                  {task.dueAt ? <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">Due {formatRelativeTime(task.dueAt)}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Doctor workload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.analytics.doctorWorkload.map((doctor) => (
                <div key={doctor.doctorId} className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
                  <span className="font-medium text-slate-950">{doctor.name}</span>
                  <span className="text-muted-foreground">{doctor.appointmentsToday} today</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}