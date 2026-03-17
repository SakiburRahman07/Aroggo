import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { generateOperationalSummary } from "@/features/ai/service";
import { getOperationsDashboard } from "@/features/dashboard/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { getDefaultDashboardRoute } from "@/lib/security/navigation";
import { formatRelativeTime } from "@/lib/utils";

export default async function OperationsDashboardPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["analytics:read_operational", "ai:use_ops"]);

  if (membership.role !== "OPERATIONS_MANAGER") {
    redirect(getDefaultDashboardRoute(membership.role, workspaceSlug));
  }

  const dashboard = await getOperationsDashboard(workspace.id);
  const summary = await generateOperationalSummary(workspace.id, membership.userId, dashboard.analytics);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Throughput and coordination"
        description="Monitor backlog, bottlenecks, no-shows, and team load from a single operational command surface."
        actions={
          <Button asChild>
            <Link href={`/app/${workspaceSlug}/analytics`}>Open analytics</Link>
          </Button>
        }
      />
      <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Weekly ops digest</p>
        <p className="mt-3 max-w-4xl text-base leading-7 text-muted-foreground">{summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Appointments today" value={dashboard.analytics.appointmentsToday} />
        <StatCard label="Overdue tasks" value={dashboard.analytics.overdueTasks} tone="warning" />
        <StatCard label="Follow-up backlog" value={dashboard.analytics.followUps} tone="warning" />
        <StatCard label="No-shows" value={dashboard.noShowCount} tone="warning" />
        <StatCard label="AI actions today" value={dashboard.analytics.aiUsage} tone="success" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Task aging and blockers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {dashboard.agingTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{task.title}</p>
                    <p className="text-muted-foreground">{task.assignee?.profile?.fullName ?? task.assignee?.email ?? "Unassigned"}</p>
                  </div>
                  <p className="text-muted-foreground">{task.dueAt ? `Due ${formatRelativeTime(task.dueAt)}` : "No due date"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Doctor workload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.analytics.doctorWorkload.map((doctor) => (
                <div key={doctor.doctorId} className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
                  <span className="font-medium text-slate-950">{doctor.name}</span>
                  <span className="text-muted-foreground">{doctor.appointmentsToday} booked</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Department coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {dashboard.departmentLoad.map((department) => (
                <div key={department.id} className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
                  <span className="font-medium text-slate-950">{department.name}</span>
                  <span className="text-muted-foreground">{department.memberCount} active members</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}