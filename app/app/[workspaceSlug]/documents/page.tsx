import Link from "next/link";
import { uploadDocumentAction } from "@/features/documents/actions";
import { listDocuments } from "@/features/documents/service";
import { listPatientOptions } from "@/features/patients/service";
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

export default async function DocumentsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, documentReadPermissions);
  const documentAccess = getScopedDocumentAccess(membership.role);
  const patientAccess = getScopedPatientAccess(membership.role);
  const [documents, patients] = await Promise.all([
    listDocuments(workspace.id, viewer),
    documentAccess.canUpload && patientAccess.readBasic ? listPatientOptions(workspace.id, viewer) : Promise.resolve([])
  ]);
  const uploadAction = uploadDocumentAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Documents"
        title={membership.role === "LAB_STAFF" ? "Report workflows" : "Document workflows"}
        description="Upload, review, and trace workspace documents within the access scope for your role."
      />
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
                    <Select name="patientId" defaultValue="">
                      <option value="">Workspace document</option>
                      {patients.map((patient) => (
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
          {documents.length === 0 ? (
            <EmptyState title="No documents yet" description="Documents in your current scope will appear here after uploads are processed." />
          ) : (
            documents.map((document) => (
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