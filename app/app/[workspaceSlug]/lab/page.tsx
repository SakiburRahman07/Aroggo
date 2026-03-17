import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getLabDashboard } from "@/features/dashboard/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { getDefaultDashboardRoute } from "@/lib/security/navigation";
import { formatRelativeTime } from "@/lib/utils";

export default async function LabDashboardPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug, ["documents:read_lab", "reports:upload"]);

  if (membership.role !== "LAB_STAFF") {
    redirect(getDefaultDashboardRoute(membership.role, workspaceSlug));
  }

  const dashboard = await getLabDashboard(workspace.id, membership.userId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Lab operations"
        title="Report intake and processing"
        description="Monitor report uploads, processing health, AI extraction readiness, and lab-specific task flow."
        actions={
          <div className="flex gap-3">
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/documents`}>Open report queue</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/scan`}>Scan patient QR</Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recent reports" value={dashboard.recentReports.length} />
        <StatCard label="Ready today" value={dashboard.readyReports} tone="success" />
        <StatCard label="Still processing" value={dashboard.processingReports} tone="warning" />
        <StatCard label="Failed parsing" value={dashboard.failedReports} tone="warning" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Verification queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.recentReports.map((document) => (
              <Link key={document.id} href={`/app/${workspaceSlug}/documents/${document.id}`} className="block rounded-2xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{document.title}</p>
                    <p className="text-sm text-muted-foreground">{document.patient?.fullName ?? "Unlinked report"}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{document.processingStatus}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lab tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {dashboard.labTasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-border/70 p-4">
                <p className="font-medium text-slate-950">{task.title}</p>
                {task.dueAt ? <p className="text-muted-foreground">Due {formatRelativeTime(task.dueAt)}</p> : <p className="text-muted-foreground">No due date</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
