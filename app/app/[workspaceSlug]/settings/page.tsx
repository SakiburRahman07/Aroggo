import Link from "next/link";
import { updateWorkspaceSettingsAction } from "@/features/workspace/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireWorkspaceContext } from "@/lib/auth/session";

export default async function SettingsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "workspace:manage");
  const updateAction = updateWorkspaceSettingsAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="Manage clinic identity, timezone, and platform-level settings."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/app/${workspaceSlug}/settings/billing`}>Billing placeholder</Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Workspace profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Name</label>
                <Input name="name" defaultValue={workspace.name} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Timezone</label>
                <Input name="timezone" defaultValue={workspace.timezone} required />
              </div>
              <Button type="submit">Save settings</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>OpsPilot Health keeps authorization and tenant isolation on the server. Documents are uploaded to Supabase Storage with signed access links, AI output is persisted for review, and audit logs capture sensitive mutations.</p>
            <p>Future workspace controls can expand here for reminder policy, AI guardrails, billing configuration, and usage limits.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

