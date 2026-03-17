import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getDoctorDashboard } from "@/features/dashboard/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { getDefaultDashboardRoute } from "@/lib/security/navigation";
import { formatDate, formatDateTime, formatRelativeTime } from "@/lib/utils";

export default async function DoctorDashboardPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["patients:read_clinical", "appointments:read_own"]);

  if (membership.role !== "DOCTOR") {
    redirect(getDefaultDashboardRoute(membership.role, workspaceSlug));
  }

  const dashboard = await getDoctorDashboard(workspace.id, membership.userId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Doctor workspace"
        title="My clinical operations dashboard"
        description="Stay on top of your schedule, follow-ups, reports, and documentation tasks without leaving the patient workflow."
        actions={
          <Button asChild>
            <Link href={`/app/${workspaceSlug}/appointments`}>Open my schedule</Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Appointments today" value={dashboard.todayAppointments.length} />
        <StatCard label="Patients waiting" value={dashboard.waitingCount} tone="warning" />
        <StatCard label="Patients under care" value={dashboard.patientCount} />
        <StatCard label="Draft visits" value={dashboard.draftVisits} tone="warning" />
        <StatCard label="Assigned tasks" value={dashboard.assignedTasks.length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.todayAppointments.map((appointment) => (
              <Link key={appointment.id} href={`/app/${workspaceSlug}/appointments/${appointment.id}`} className="block rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{appointment.patient.fullName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDateTime(appointment.scheduledAt)}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.followUps.map((visit) => (
                <div key={visit.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{visit.patient.fullName}</p>
                  <p className="text-muted-foreground">Follow-up due {visit.followUpDate ? formatDate(visit.followUpDate) : "soon"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent reports pending review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.recentReports.map((document) => (
                <Link key={document.id} href={`/app/${workspaceSlug}/documents/${document.id}`} className="block rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{document.title}</p>
                  <p className="text-muted-foreground">{document.patient?.fullName ?? "Workspace document"}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assigned tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.assignedTasks.map((task) => (
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