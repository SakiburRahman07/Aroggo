import { formatDateTime } from "@/lib/utils";
import { getPatientPortalSnapshot } from "@/features/patient-portal/service";
import { requirePatientPortalContext } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalAppointmentsPage() {
  const { user } = await requirePatientPortalContext();
  const snapshot = await getPatientPortalSnapshot(user.id);

  if (!snapshot) {
    return null;
  }

  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <CardHeader><CardTitle>My appointments</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {snapshot.appointments.map((appointment) => (
          <div key={appointment.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
            <p className="font-medium text-slate-950">{appointment.reason}</p>
            <p className="text-slate-600">{formatDateTime(appointment.scheduledAt)}</p>
            <p className="text-slate-600">Doctor: {appointment.doctor.profile?.fullName ?? appointment.doctor.email}</p>
            <p className="text-teal-700">Status: {appointment.status}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
