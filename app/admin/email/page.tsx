import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAdminSnapshot } from "@/features/admin/service";

export default async function AdminEmailPage() {
  const snapshot = await getPlatformAdminSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Email" title="Delivery monitor" description="Review invite, reminder, and transactional email delivery across tenants." />
      <Card>
        <CardHeader>
          <CardTitle>Recent email delivery attempts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {snapshot.recentEmails.map((email) => (
            <div key={email.id} className="rounded-2xl border border-border/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-950">{email.subject}</p>
                  <p className="text-muted-foreground">{email.recipient}</p>
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{email.status}</p>
              </div>
              {email.errorMessage ? <p className="mt-2 text-rose-600">{email.errorMessage}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}