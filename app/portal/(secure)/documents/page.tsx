import Link from "next/link";
import { getPatientPortalSnapshot } from "@/features/patient-portal/service";
import { requirePatientPortalContext } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalDocumentsPage() {
  const { user } = await requirePatientPortalContext();
  const snapshot = await getPatientPortalSnapshot(user.id);

  if (!snapshot) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/90">
        <CardHeader><CardTitle>Released documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {snapshot.documents.map((document) => (
            <div key={document.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
              <p className="font-medium text-slate-950">{document.title}</p>
              <p className="text-slate-600">{document.docType.replaceAll("_", " ")}</p>
              <p className="mt-2 text-slate-600">{document.summary ?? "Summary will appear here after release."}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-[28px] border-white/70 bg-white/90">
        <CardHeader><CardTitle>Released visit summaries</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {snapshot.visits.map((visit) => (
            <div key={visit.id} className="rounded-2xl border border-slate-200 p-4 text-sm">
              <p className="font-medium text-slate-950">{visit.patientSummary ?? "Visit summary"}</p>
              <p className="text-slate-600">Doctor: {visit.doctor.profile?.fullName ?? visit.doctor.email}</p>
              <p className="mt-2 text-slate-600">Prescription: {visit.prescriptionText ?? "No prescription published."}</p>
              <p className="mt-2 text-teal-700">Follow-up: {visit.followUpInstructions ?? "No follow-up notes published."}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
