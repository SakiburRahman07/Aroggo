import Link from "next/link";
import { uploadDocumentAction } from "@/features/documents/actions";
import { listDocuments } from "@/features/documents/service";
import { listPatientOptions, type PatientOption } from "@/features/patients/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { documentReadPermissions, documentStatusLabels } from "@/lib/security/permissions";
import { getScopedDocumentAccess, getScopedPatientAccess } from "@/lib/security/scopes";
import { formatDateTime } from "@/lib/utils";

const documentTypes = ["LAB_REPORT", "PRESCRIPTION", "IMAGING", "INSURANCE", "CONSENT", "INTERNAL_NOTE", "SOP", "OTHER"] as const;

export default async function DocumentsPage({
  params,
  searchParams
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ patientId?: string; scan?: string; error?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { patientId: selectedPatientId = "", scan, error } = await searchParams;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, documentReadPermissions);
  const documentAccess = getScopedDocumentAccess(membership.role);
  const patientAccess = getScopedPatientAccess(membership.role);
  const [documents, patients] = await Promise.all([
    listDocuments(workspace.id, viewer),
    documentAccess.canUpload && patientAccess.readBasic ? listPatientOptions(workspace.id, viewer) : Promise.resolve([])
  ]);
  const uploadAction = uploadDocumentAction.bind(null, workspaceSlug);
  const filteredDocuments = selectedPatientId
    ? documents.filter((document) => document.patient?.id === selectedPatientId)
    : documents;
  const selectedPatient = selectedPatientId
    ? patients.find((patient: PatientOption) => patient.id === selectedPatientId) ?? null
    : null;

  return (
    <div className="space-y-8">`r`n      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <PageHeader
        eyebrow="Documents"
        title={membership.role === "LAB_STAFF" ? "Report workflows" : "Document workflows"}
        description={selectedPatient
          ? `Continuing QR-resolved workflow for ${selectedPatient.fullName}. Uploads and queue items are focused on this patient.`
          : "Upload, review, and trace workspace documents within the access scope for your role."}
      />
      {selectedPatient ? (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="flex flex-col gap-3 p-5 text-sm text-emerald-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">Active patient context</p>
              <p>{selectedPatient.fullName} is preselected from a secure QR scan{scan ? ` (${scan})` : ""}.</p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/app/${workspaceSlug}/scan/context/${selectedPatient.id}`}>Back to scan context</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        {documentAccess.canUpload ? (
          <Card>
            <CardHeader>
              <CardTitle>{membership.role === "LAB_STAFF" ? "Upload report" : "Upload document"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={uploadAction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Title</label>
                  <Input name="title" required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Type</label>
                    <Select name="docType" defaultValue={membership.role === "LAB_STAFF" ? "LAB_REPORT" : "INTERNAL_NOTE"}>
                      {documentTypes.map((type) => (
                        <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Linked patient</label>
                    <Select name="patientId" defaultValue={selectedPatientId}>
                      <option value="">Workspace document</option>
                      {patients.map((patient: PatientOption) => (
                        <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">File</label>
                  <input className="block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm" name="file" type="file" required />
                </div>
                <Button type="submit" className="w-full">Upload and process</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Document access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Your role can review documents in scope, but document upload is reserved for clinic admins and lab staff.</p>
              <p>Use this queue to inspect summaries, processing status, and linked records relevant to your role.</p>
            </CardContent>
          </Card>
        )}
        <div className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <EmptyState title="No documents yet" description={selectedPatient ? "No documents in your scope are linked to this patient yet." : "Documents in your current scope will appear here after uploads are processed."} />
          ) : (
            filteredDocuments.map((document) => (
              <Link key={document.id} href={`/app/${workspaceSlug}/documents/${document.id}`}>
                <Card className="bg-white/90 transition hover:-translate-y-0.5">
                  <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{document.title}</p>
                      <p className="text-sm text-muted-foreground">{document.patient?.fullName ?? "Workspace document"}</p>
                    </div>
                    <div className="text-sm text-muted-foreground md:text-right">
                      <p>{documentStatusLabels[document.processingStatus]}</p>
                      <p>{formatDateTime(document.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

