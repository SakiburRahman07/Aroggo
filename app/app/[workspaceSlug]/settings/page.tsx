import Link from "next/link";
import { updateWorkspaceSettingsAction } from "@/features/workspace/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireWorkspaceContext } from "@/lib/auth/session";

export default async function SettingsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "settings:manage");
  const updateAction = updateWorkspaceSettingsAction.bind(null, workspaceSlug);
  const settings = typeof workspace.settingsJson === "object" && workspace.settingsJson ? workspace.settingsJson as Record<string, unknown> : {};

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace configuration"
        description="Manage clinic identity, timezone, patient portal, and QR workflow controls."
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
              <label className="flex items-center gap-3 text-sm text-slate-700"><input name="patientPortalEnabled" type="checkbox" defaultChecked={Boolean(settings.patientPortalEnabled ?? true)} /> Enable patient portal</label>
              <label className="flex items-center gap-3 text-sm text-slate-700"><input name="qrEnabled" type="checkbox" defaultChecked={Boolean(settings.qrEnabled ?? true)} /> Enable secure QR workflows</label>
              <label className="flex items-center gap-3 text-sm text-slate-700"><input name="kioskModeEnabled" type="checkbox" defaultChecked={Boolean(settings.kioskModeEnabled ?? false)} /> Enable kiosk-style self check-in mode</label>
              <Button type="submit">Save settings</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>Aroggo keeps authorization and tenant isolation on the server. QR payloads only carry opaque public identifiers, while role-aware scan resolution and patient release controls happen securely on the backend.</p>
            <p>These workspace settings now control whether clinics expose patient self-service, secure scan workflows, and kiosk-oriented check-in behavior.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
