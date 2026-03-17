import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAdminSnapshot } from "@/features/admin/service";

export default async function AdminSupportPage() {
  const snapshot = await getPlatformAdminSnapshot();
  const failedEmailItems = snapshot.recentEmails.filter((email) => email.status === "FAILED");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Support" title="Support readiness" description="Use this view to triage failing tenants, delivery incidents, and operational risk before they escalate." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspaces needing attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {snapshot.workspaceHealth.map((workspace) => (
              <div key={workspace.id} className="rounded-2xl border border-border/70 p-4">
                <p className="font-medium text-slate-950">{workspace.name}</p>
                <p className="text-muted-foreground">Failed docs: {workspace.failedDocs} | Pending invites: {workspace.pendingInvites}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent delivery issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {failedEmailItems.length > 0 ? (
              failedEmailItems.map((email) => (
                <div key={email.id} className="rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{email.subject}</p>
                  <p className="text-muted-foreground">{email.recipient}</p>
                  {email.errorMessage ? <p className="mt-2 text-rose-600">{email.errorMessage}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No recent delivery issues were recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}