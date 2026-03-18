import { resolveScanInputAction } from "@/features/patient-portal/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

function getErrorCopy(error?: string) {
  switch (error) {
    case "revoked":
      return {
        title: "QR code revoked",
        description: "This patient QR code has been revoked. Ask front desk to refresh the patient QR before trying again."
      };
    case "expired":
      return {
        title: "QR code expired",
        description: "This patient QR code has expired. Generate a fresh QR and scan again."
      };
    case "unauthorized":
      return {
        title: "Patient is outside your current scope",
        description: "The QR is valid, but this staff account does not currently have the right appointment or visit access for this patient."
      };
    case "session":
      return {
        title: "Sign in required",
        description: "Your staff session is missing or expired. Sign in again, then retry the patient QR scan."
      };
    case "workflow":
      return {
        title: "Workflow resolution failed",
        description: "The patient QR resolved, but the next workflow could not be built. Use manual patient search or try the scan again after checking assignment data."
      };
    default:
      return {
        title: "QR could not be resolved",
        description: "The scan did not reach a valid patient workflow. Confirm the QR and try again, or continue with manual patient search."
      };
  }
}

export default async function StaffScanPage({
  params,
  searchParams
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams?: Promise<{ error?: string; patientId?: string; scanned?: string }>;
}) {
  const { workspaceSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const action = resolveScanInputAction.bind(null, workspaceSlug);
  const errorCopy = resolvedSearchParams?.error ? getErrorCopy(resolvedSearchParams.error) : null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="QR Scan" title="Scan or paste patient QR" description="Use the secure patient QR public ID or full scan URL. The server will resolve role-specific access after validation." />
      {errorCopy ? (
        <Card className="max-w-3xl border-red-200 bg-red-50">
          <CardHeader className="space-y-2">
            <Badge variant="secondary" className="w-fit border-red-200 bg-white text-red-700">Scan issue</Badge>
            <CardTitle className="text-red-900">{errorCopy.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-red-900">
            <p>{errorCopy.description}</p>
            {resolvedSearchParams?.patientId ? <p>Patient ID: {resolvedSearchParams.patientId}</p> : null}
            {resolvedSearchParams?.scanned ? <p>Scanned QR: {resolvedSearchParams.scanned}</p> : null}
          </CardContent>
        </Card>
      ) : null}
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
