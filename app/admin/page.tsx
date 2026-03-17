import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getPlatformAdminSnapshot, type PlatformRecentAuditLog, type PlatformRecentEmail, type PlatformWorkspaceHealth } from "@/features/admin/service";
import { formatRelativeTime } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const snapshot = await getPlatformAdminSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Platform overview"
        title="Tenant health and delivery visibility"
        description="Track workspace growth, queue health, AI usage, and operational failures across the full platform."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Workspaces" value={snapshot.stats.workspaceCount} />
        <StatCard label="Active members" value={snapshot.stats.activeMemberships} />
        <StatCard label="Pending documents" value={snapshot.stats.pendingDocuments} tone="warning" />
        <StatCard label="Failed documents" value={snapshot.stats.failedDocuments} tone="warning" />
        <StatCard label="Failed emails" value={snapshot.stats.failedEmails} tone="warning" />
        <StatCard label="AI queries today" value={snapshot.stats.aiQueriesToday} tone="success" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workspace health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.workspaceHealth.map((workspace: PlatformWorkspaceHealth) => (
              <div key={workspace.id} className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-950">{workspace.name}</p>
                    <p className="text-sm text-muted-foreground">{workspace.slug}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{workspace._count.memberships} active seats</p>
                    <p>{workspace.aiQueries} AI queries today</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
                  <div className="rounded-2xl bg-muted/30 p-3">Documents: {workspace._count.documents}</div>
                  <div className="rounded-2xl bg-muted/30 p-3">Patients: {workspace._count.patients}</div>
                  <div className="rounded-2xl bg-muted/30 p-3">Failed docs: {workspace.failedDocs}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent email activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {snapshot.recentEmails.map((email: PlatformRecentEmail) => (
                <div key={email.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{email.subject}</p>
                  <p className="text-muted-foreground">{email.recipient}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{email.status}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent audit activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {snapshot.recentAuditLogs.map((log: PlatformRecentAuditLog) => (
                <div key={log.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{log.entityType} - {log.action}</p>
                  <p className="text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
