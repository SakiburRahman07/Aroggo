import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAdminSnapshot } from "@/features/admin/service";

export default async function AdminUsersPage() {
  const snapshot = await getPlatformAdminSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Users" title="Recent platform users" description="Review signups and active workspace assignments across tenants." />
      <Card>
        <CardHeader>
          <CardTitle>User activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.recentUsers.map((user) => (
            <div key={user.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-slate-950">{user.profile?.fullName ?? user.name ?? user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.memberships.map((membership) => `${membership.workspace.name} (${membership.role})`).join(", ") || "No active memberships"}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}