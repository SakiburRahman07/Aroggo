import { createAppointmentAction } from "@/features/appointments/actions";
import { listDoctorOptions, type AppointmentDoctorOption } from "@/features/appointments/service";
import { listPatientOptions, type PatientOption } from "@/features/patients/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireWorkspaceContext } from "@/lib/auth/session";

export default async function NewAppointmentPage({
  params,
  searchParams
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ patientId?: string; error?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { patientId, error } = await searchParams;
  const { workspace, viewer } = await requireWorkspaceContext(workspaceSlug, "appointments:write");
  const [patients, doctors] = await Promise.all([listPatientOptions(workspace.id, viewer), listDoctorOptions(workspace.id)]);
  const createAction = createAppointmentAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Appointments" title="Book appointment" description="Prevent scheduling conflicts and link the appointment to the right patient and doctor." />
      {error ? <div className="max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Appointment details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Patient</label>
              <Select name="patientId" defaultValue={patientId} required>
                <option value="">Select patient</option>
                {patients.map((patient: PatientOption) => (
                  <option key={patient.id} value={patient.id}>{patient.fullName} ({patient.patientCode})</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Doctor</label>
              <Select name="doctorUserId" required>
                <option value="">Select doctor</option>
                {doctors.map((doctor: AppointmentDoctorOption) => (
                  <option key={doctor.userId} value={doctor.userId}>{doctor.user.profile?.fullName ?? doctor.user.email}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date and time</label>
              <Input name="scheduledAt" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Duration (minutes)</label>
              <Input name="durationMinutes" type="number" defaultValue="30" min="10" max="240" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Reason</label>
              <Input name="reason" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Textarea name="notes" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create appointment</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
