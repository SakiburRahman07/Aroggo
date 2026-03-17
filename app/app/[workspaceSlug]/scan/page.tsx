import { resolveScanInputAction } from "@/features/patient-portal/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

export default async function StaffScanPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const action = resolveScanInputAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="QR Scan" title="Scan or paste patient QR" description="Use the secure patient QR public ID or full scan URL. The server will resolve role-specific access after validation." />
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Secure scanner entry</CardTitle></CardHeader>
        <CardContent>
          <form action={action} className="space-y-4">
            <Input name="scanInput" placeholder="Paste public ID or https://.../scan/ptid_xxx" required />
            <Button type="submit">Resolve patient QR</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
