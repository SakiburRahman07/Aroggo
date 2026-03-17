import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getPlatformAdminSnapshot, type PlatformWorkspaceHealth } from "@/features/admin/service";

export default async function AdminAiPage() {
  const snapshot = await getPlatformAdminSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="AI" title="AI usage monitor" description="Track tenant AI activity and surface workspaces that may need guardrails or quota tuning." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="AI queries today" value={snapshot.stats.aiQueriesToday} tone="success" />
        <StatCard label="Pending documents" value={snapshot.stats.pendingDocuments} tone="warning" />
        <StatCard label="Failed documents" value={snapshot.stats.failedDocuments} tone="warning" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workspace AI activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {snapshot.workspaceHealth.map((workspace: PlatformWorkspaceHealth) => (
            <div key={workspace.id} className="rounded-2xl border border-border/70 p-4">
              <p className="font-medium text-slate-950">{workspace.name}</p>
              <p className="text-muted-foreground">{workspace.aiQueries} AI queries today and {workspace.failedDocs} failed documents waiting for review.</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
