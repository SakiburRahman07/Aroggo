import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getPlatformAdminSnapshot, type PlatformWorkspaceHealth } from "@/features/admin/service";

export default async function AdminUsagePage() {
  const snapshot = await getPlatformAdminSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Usage" title="Platform usage readiness" description="Track the key signals needed for future quotas, billing, and support planning." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" value={snapshot.stats.activeMemberships} />
        <StatCard label="Pending documents" value={snapshot.stats.pendingDocuments} tone="warning" />
        <StatCard label="AI queries today" value={snapshot.stats.aiQueriesToday} tone="success" />
        <StatCard label="Failed emails" value={snapshot.stats.failedEmails} tone="warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workspace consumption snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {snapshot.workspaceHealth.map((workspace: PlatformWorkspaceHealth) => (
            <div key={workspace.id} className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium text-slate-950">{workspace.name}</p>
              <p className="text-muted-foreground">{workspace._count.documents} documents, {workspace._count.appointments} appointments, {workspace.aiQueries} AI queries today</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
