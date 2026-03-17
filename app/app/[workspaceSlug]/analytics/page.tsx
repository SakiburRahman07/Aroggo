import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { getWorkspaceAnalytics } from "@/features/analytics/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { analyticsReadPermissions } from "@/lib/security/permissions";

export default async function AnalyticsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, analyticsReadPermissions);
  const analytics = await getWorkspaceAnalytics(workspace.id);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Analytics" title="Operational visibility" description="Track throughput, backlog, document flow, and AI activity across the clinic." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointments today" value={analytics.appointmentsToday} />
        <StatCard label="Overdue tasks" value={analytics.overdueTasks} tone="warning" />
        <StatCard label="Follow-ups" value={analytics.followUps} />
        <StatCard label="AI actions today" value={analytics.aiUsage} tone="success" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Document processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {analytics.processingDistribution.map((item) => (
              <div key={item.processingStatus} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-950">{item.processingStatus}</span>
                  <span className="text-muted-foreground">{item._count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Doctor workload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {analytics.doctorWorkload.map((doctor) => (
              <div key={doctor.doctorId} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-950">{doctor.name}</span>
                  <span className="text-muted-foreground">{doctor.appointmentsToday} scheduled</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}