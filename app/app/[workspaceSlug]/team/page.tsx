import { inviteWorkspaceMemberAction } from "@/features/workspace/actions";
import { getWorkspaceTeamSnapshot } from "@/features/workspace/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { roleLabels } from "@/lib/security/permissions";

const roleOptions = ["CLINIC_ADMIN", "DOCTOR", "RECEPTIONIST", "LAB_STAFF", "OPERATIONS_MANAGER"] as const;

export default async function TeamPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "members:manage");
  const snapshot = await getWorkspaceTeamSnapshot(workspace.id);
  const inviteAction = inviteWorkspaceMemberAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Team" title="Members and invites" description="Manage access, roles, and department placement for your clinic workspace." />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Invite staff</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={inviteAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input name="email" type="email" placeholder="staff@clinic.com" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Role</label>
                <Select name="role" defaultValue="DOCTOR">
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Department</label>
                <Select name="departmentId" defaultValue="">
                  <option value="">No department</option>
                  {snapshot.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="w-full">Send invite</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {snapshot.members.length > 0 ? (
                snapshot.members.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-950">{member.user.profile?.fullName ?? member.user.name ?? member.user.email}</p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{roleLabels[member.role]}</p>
                        <p>{member.department?.name ?? "No department"}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState title="No members yet" description="Invite doctors, receptionists, lab staff, and managers into the workspace." />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending invites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {snapshot.invites.length > 0 ? (
                snapshot.invites.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-950">{invite.email}</p>
                        <p className="text-muted-foreground">{roleLabels[invite.role]}</p>
                      </div>
                      <p className="text-muted-foreground">Expires {invite.expiresAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No pending invites.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

