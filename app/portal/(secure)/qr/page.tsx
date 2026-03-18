import { getPatientPortalSnapshot } from "@/features/patient-portal/service";
import { requirePatientPortalContext } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "@/components/ui/qr-code";

export default async function PortalQrPage() {
  const { user } = await requirePatientPortalContext();
  const snapshot = await getPatientPortalSnapshot(user.id);

  if (!snapshot) {
    return null;
  }

  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <CardHeader><CardTitle>Digital patient ID</CardTitle></CardHeader>
      <CardContent className="space-y-5 text-sm">
        <p className="text-slate-600">Use this secure patient QR for front-desk lookup and self check-in. It resolves server-side and never exposes your records directly.</p>
        <div className="flex justify-center">
          <QrCode value={snapshot.scanUrl} size={260} />
        </div>
        <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-teal-200 break-all">{snapshot.scanUrl}</div>
        <div className="rounded-2xl bg-teal-50 p-4 text-teal-900">
          <p className="font-medium">Permanent public ID</p>
          <p>{snapshot.latestQr.publicId}</p>
        </div>
      </CardContent>
    </Card>
  );
}
