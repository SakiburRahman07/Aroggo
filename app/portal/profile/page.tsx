import { requestPortalProfileUpdateAction } from "@/features/patient-portal/actions";
import { getPatientPortalSnapshot } from "@/features/patient-portal/service";
import { requirePatientPortalContext } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function PortalProfilePage() {
  const { user, patient } = await requirePatientPortalContext();
  const snapshot = await getPatientPortalSnapshot(user.id);

  if (!snapshot) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <CardHeader>
          <CardTitle>My profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-950">Contact on file</p>
            <p className="mt-2">Phone: {patient.phone}</p>
            <p>Email: {patient.email ?? "Not added"}</p>
            <p>Address: {patient.address ?? "Not added"}</p>
            <p>Emergency contact: {patient.emergencyContact ?? "Not added"}</p>
          </div>
          <form action={requestPortalProfileUpdateAction} className="grid gap-3">
            <Input name="phone" placeholder="Updated phone" defaultValue={patient.phone} />
            <Input name="email" type="email" placeholder="Updated email" defaultValue={patient.email ?? ""} />
            <Input name="address" placeholder="Updated address" defaultValue={patient.address ?? ""} />
            <Input name="emergencyContact" placeholder="Updated emergency contact" defaultValue={patient.emergencyContact ?? ""} />
            <Button type="submit">Request profile update</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/70 bg-white/90">
          <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold text-slate-950">{snapshot.appointments.length}</CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/70 bg-white/90">
          <CardHeader><CardTitle>Released documents</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold text-slate-950">{snapshot.documents.length}</CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/70 bg-white/90">
          <CardHeader><CardTitle>Released visit updates</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold text-slate-950">{snapshot.visits.length}</CardContent>
        </Card>
      </div>
    </div>
  );
}
