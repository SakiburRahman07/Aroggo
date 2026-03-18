import { portalSelfCheckInAction } from "@/features/patient-portal/actions";
import { getPatientPortalSnapshot } from "@/features/patient-portal/service";
import { requirePatientPortalContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalCheckInPage({ searchParams }: { searchParams: Promise<{ qr?: string; error?: string }> }) {
  const { user } = await requirePatientPortalContext();
  const { qr, error } = await searchParams;
  const snapshot = await getPatientPortalSnapshot(user.id);

  if (!snapshot) {
    return null;
  }

  const activeQr = qr ?? snapshot.latestQr.publicId;

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <CardHeader><CardTitle>Self check-in</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-slate-600">Use your patient portal session to confirm arrival for your upcoming appointment.</p>
          <form action={portalSelfCheckInAction} className="space-y-3">
            <input type="hidden" name="qr" value={activeQr} />
            <div className="rounded-2xl bg-slate-50 p-4 text-slate-700">Secure check-in code: {activeQr}</div>
            <Button type="submit">Check in now</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
