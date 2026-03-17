import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAdminSnapshot } from "@/features/admin/service";

export default async function AdminWorkspacesPage() {
  const snapshot = await getPlatformAdminSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Workspaces" title="Tenant directory" description="Monitor tenant footprint, adoption, and issue hotspots across clinic workspaces." />
      <Card>
        <CardHeader>
          <CardTitle>Workspace inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.workspaceHealth.map((workspace) => (
            <div key={workspace.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-slate-950">{workspace.name}</p>
                  <p className="text-sm text-muted-foreground">Owner: {workspace.creator.profile?.fullName ?? workspace.creator.email}</p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                  <span>{workspace._count.memberships} members</span>
                  <span>{workspace._count.patients} patients</span>
                  <span>{workspace.failedDocs} failed docs</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}