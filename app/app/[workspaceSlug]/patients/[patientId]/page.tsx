import Link from "next/link";
import { updatePatientAction } from "@/features/patients/actions";
import { getPatientDetail } from "@/features/patients/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function PatientDetailPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "patients:read");
  const patient = await getPatientDetail(workspace.id, patientId);

  if (!patient) {
    return <div className="text-sm text-muted-foreground">Patient not found.</div>;
  }

  const updateAction = updatePatientAction.bind(null, workspaceSlug, patientId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient detail"
        title={patient.fullName}
        description={`${patient.patientCode} • ${patient.phone}`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/app/${workspaceSlug}/appointments/new?patientId=${patient.id}`}>Book appointment</Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Full name</label>
                <Input name="fullName" defaultValue={patient.fullName} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date of birth</label>
                <Input name="dob" type="date" defaultValue={patient.dob ? new Date(patient.dob).toISOString().split("T")[0] : ""} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Gender</label>
                <Select name="gender" defaultValue={patient.gender}>
                  <option value="UNDISCLOSED">Undisclosed</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <Input name="phone" defaultValue={patient.phone} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input name="email" type="email" defaultValue={patient.email ?? ""} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Address</label>
                <Input name="address" defaultValue={patient.address ?? ""} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Emergency contact</label>
                <Input name="emergencyContact" defaultValue={patient.emergencyContact ?? ""} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Notes</label>
                <Textarea name="notes" defaultValue={patient.notes ?? ""} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent appointments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {patient.appointments.map((appointment) => (
                <Link key={appointment.id} href={`/app/${workspaceSlug}/appointments/${appointment.id}`} className="block rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{appointment.reason}</p>
                  <p className="text-muted-foreground">{formatDateTime(appointment.scheduledAt)} • {appointment.doctor.profile?.fullName ?? appointment.doctor.email}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Visit timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {patient.visits.map((visit) => (
                <Link key={visit.id} href={`/app/${workspaceSlug}/visits/${visit.id}`} className="block rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">Visit {formatDate(visit.createdAt)}</p>
                  <p className="text-muted-foreground">{visit.doctor.profile?.fullName ?? visit.doctor.email}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Linked documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {patient.documents.map((document) => (
                <Link key={document.id} href={`/app/${workspaceSlug}/documents/${document.id}`} className="block rounded-2xl border border-border/70 p-4">
                  <p className="font-medium text-slate-950">{document.title}</p>
                  <p className="text-muted-foreground">{document.processingStatus}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
