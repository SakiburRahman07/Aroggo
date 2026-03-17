import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "@/components/ui/qr-code";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updatePatientAction } from "@/features/patients/actions";
import { ensurePatientPermanentQrAction, reissuePatientPermanentQrAction, sendPatientPortalInviteAction } from "@/features/patient-portal/actions";
import { getStaffPatientPortalSnapshot } from "@/features/patient-portal/service";
import { getPatientDetail } from "@/features/patients/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { appointmentReadPermissions, documentReadPermissions, patientReadPermissions } from "@/lib/security/permissions";
import { getScopedAppointmentAccess, getScopedDocumentAccess, getScopedPatientAccess, getScopedVisitAccess } from "@/lib/security/scopes";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function PatientDetailPage({ params }: { params: Promise<{ workspaceSlug: string; patientId: string }> }) {
  const { workspaceSlug, patientId } = await params;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, patientReadPermissions);
  const [patient, portalSnapshot] = await Promise.all([
    getPatientDetail(workspace.id, patientId, viewer),
    getStaffPatientPortalSnapshot(workspace.id, patientId)
  ]);

  if (!patient) {
    return <div className="text-sm text-muted-foreground">Patient not found.</div>;
  }

  const patientAccess = getScopedPatientAccess(membership.role);
  const appointmentAccess = getScopedAppointmentAccess(membership.role);
  const visitAccess = getScopedVisitAccess(membership.role);
  const documentAccess = getScopedDocumentAccess(membership.role);
  const updateAction = updatePatientAction.bind(null, workspaceSlug, patientId);
  const sendInviteAction = sendPatientPortalInviteAction.bind(null, workspaceSlug, patientId);
  const ensureQrAction = ensurePatientPermanentQrAction.bind(null, workspaceSlug, patientId);
  const reissueQrAction = reissuePatientPermanentQrAction.bind(null, workspaceSlug, patientId);
  const canReadDocuments = documentAccess.readClinical || documentAccess.readLab || documentAccess.readOpsLimited;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patient detail"
        title={patient.fullName}
        description={`${patient.patientCode} - ${patient.phone}`}
        actions={
          appointmentAccess.canWrite ? (
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/appointments/new?patientId=${patient.id}`}>Book appointment</Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{patientAccess.canWriteBasic ? "Profile" : "Profile summary"}</CardTitle>
            </CardHeader>
            <CardContent>
              {patientAccess.canWriteBasic ? (
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
                  {patientAccess.readClinical ? (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Notes</label>
                      <Textarea name="notes" defaultValue={patient.notes ?? ""} />
                    </div>
                  ) : null}
                  <div className="md:col-span-2">
                    <Button type="submit">Save changes</Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Date of birth: {patient.dob ? formatDate(patient.dob) : "Not recorded"}</p>
                  <p>Gender: {patient.gender}</p>
                  <p>Email: {patient.email ?? "Not recorded"}</p>
                  <p>Address: {patient.address ?? "Not recorded"}</p>
                  <p>Emergency contact: {patient.emergencyContact ?? "Not recorded"}</p>
                  {patientAccess.readClinical ? <p>Notes: {patient.notes ?? "No notes recorded"}</p> : null}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Patient portal and QR identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl bg-muted/30 p-4 text-muted-foreground">
                <p>Portal enabled: <span className="font-medium text-slate-950">{patient.portalEnabled ? "Yes" : "No"}</span></p>
                <p>Portal activated: <span className="font-medium text-slate-950">{portalSnapshot?.portalAccount?.activatedAt ? formatDateTime(portalSnapshot.portalAccount.activatedAt) : "Not yet"}</span></p>
                <p>Released documents: <span className="font-medium text-slate-950">{portalSnapshot?.releasedDocumentCount ?? 0}</span></p>
                <p>Released visit summaries: <span className="font-medium text-slate-950">{portalSnapshot?.releasedVisitCount ?? 0}</span></p>
              </div>
              <div className="flex flex-wrap gap-3">
                <form action={sendInviteAction}><Button type="submit">Send portal invite</Button></form>
                <form action={ensureQrAction}><Button type="submit" variant="outline">Generate QR</Button></form>
                <form action={reissueQrAction}><Button type="submit" variant="outline">Reissue QR</Button></form>
              </div>
              {portalSnapshot?.latestInvite ? (
                <div className="rounded-2xl border border-border/70 p-4 text-muted-foreground">
                  Latest invite: {portalSnapshot.latestInvite.status} until {formatDateTime(portalSnapshot.latestInvite.expiresAt)}
                </div>
              ) : null}
              {portalSnapshot?.permanentQrUrl ? (
                <div className="space-y-4 rounded-3xl border border-border/70 bg-slate-50 p-4">
                  <div className="flex justify-center">
                    <QrCode value={portalSnapshot.permanentQrUrl} size={220} />
                  </div>
                  <div className="rounded-2xl bg-slate-950 p-4 font-mono text-xs text-teal-200 break-all">
                    {portalSnapshot.permanentQrUrl}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {appointmentAccess.readAll || appointmentAccess.readOwn ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent appointments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {patient.appointments.map((appointment) => (
                  <Link key={appointment.id} href={`/app/${workspaceSlug}/appointments/${appointment.id}`} className="block rounded-2xl border border-border/70 p-4">
                    <p className="font-medium text-slate-950">{appointment.reason}</p>
                    <p className="text-muted-foreground">{formatDateTime(appointment.scheduledAt)} - {appointment.doctor.profile?.fullName ?? appointment.doctor.email}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {patientAccess.readClinical && visitAccess.read ? (
            <Card>
              <CardHeader>
                <CardTitle>Visit timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {patient.visits.map((visit) => (
                  <Link key={visit.id} href={`/app/${workspaceSlug}/visits/${visit.id}`} className="block rounded-2xl border border-border/70 p-4">
                    <p className="font-medium text-slate-950">Visit {formatDate(visit.createdAt)}</p>
                    <p className="text-muted-foreground">{visit.doctor.profile?.fullName ?? visit.doctor.email}</p>
                    <p className="text-teal-700">Released to patient: {visit.releasedToPatient ? "Yes" : "No"}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {canReadDocuments ? (
            <Card>
              <CardHeader>
                <CardTitle>Linked documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {patient.documents.map((document) => (
                  <Link key={document.id} href={`/app/${workspaceSlug}/documents/${document.id}`} className="block rounded-2xl border border-border/70 p-4">
                    <p className="font-medium text-slate-950">{document.title}</p>
                    <p className="text-muted-foreground">{document.processingStatus}</p>
                    <p className="text-teal-700">Released to patient: {document.releasedToPatient ? "Yes" : "No"}</p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
