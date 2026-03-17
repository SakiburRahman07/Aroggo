import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAdminSnapshot } from "@/features/admin/service";
import { formatRelativeTime } from "@/lib/utils";

export default async function AdminLogsPage() {
  const snapshot = await getPlatformAdminSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Logs" title="Platform audit stream" description="Investigate recent tenant mutations and system-level activity across the platform." />
      <Card>
        <CardHeader>
          <CardTitle>Recent audit logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {snapshot.recentAuditLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-slate-950">{log.entityType} - {log.action}</p>
                <p className="text-muted-foreground">{formatRelativeTime(log.createdAt)}</p>
              </div>
              <p className="mt-2 text-muted-foreground">Entity ID: {log.entityId}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}