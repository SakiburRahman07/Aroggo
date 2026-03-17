import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getWorkspaceAnalytics } from "@/features/analytics/service";
import { generateOperationalSummary } from "@/features/ai/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export default async function WorkspaceOverviewPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, "analytics:read");
  const analytics = await getWorkspaceAnalytics(workspace.id);
  const summary = await generateOperationalSummary(workspace.id, membership.userId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Operational command center"
        description="Monitor today’s clinic throughput, backlog, and AI-assisted work across the workspace."
        actions={
          <Button asChild>
            <Link href={`/app/${workspace.slug}/appointments/new`}>New appointment</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointments today" value={analytics.appointmentsToday} hint="Live" />
        <StatCard label="Overdue tasks" value={analytics.overdueTasks} hint="Needs review" tone="warning" />
        <StatCard label="Follow-up backlog" value={analytics.followUps} hint="Next 7 days" />
        <StatCard label="AI actions today" value={analytics.aiUsage} hint="Workspace-wide" tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Operational summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            <p>{summary}</p>
            <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
              AI-generated summaries are editable and intended for operational review. They are not medical diagnosis outputs.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Doctor workload today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.doctorWorkload.length > 0 ? (
              analytics.doctorWorkload.map((doctor) => (
                <div key={doctor.doctorId} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{doctor.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{doctor.appointmentsToday} appointments today</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No doctors are assigned to this workspace yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Recent uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {analytics.recentUploads.length > 0 ? (
              analytics.recentUploads.map((document) => (
                <div key={document.id} className="flex items-center justify-between rounded-2xl border border-border/70 p-4">
                  <div>
                    <p className="font-medium text-slate-950">{document.title}</p>
                    <p className="text-muted-foreground">{document.processingStatus}</p>
                  </div>
                  <p className="text-muted-foreground">{formatDateTime(document.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No documents uploaded yet.</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Appointment distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {analytics.appointmentStatusDistribution.map((item) => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-950">{item.status}</span>
                  <span className="text-muted-foreground">{item._count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(10, item._count * 12)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
