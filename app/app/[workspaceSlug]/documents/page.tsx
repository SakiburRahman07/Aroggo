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
import { documentStatusLabels } from "@/lib/security/permissions";
import { formatDateTime } from "@/lib/utils";

const documentTypes = ["LAB_REPORT", "PRESCRIPTION", "IMAGING", "INSURANCE", "CONSENT", "INTERNAL_NOTE", "SOP", "OTHER"] as const;

export default async function DocumentsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "documents:read");
  const [documents, patients] = await Promise.all([listDocuments(workspace.id), listPatientOptions(workspace.id)]);
  const uploadAction = uploadDocumentAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Documents" title="Document workflows" description="Upload clinic records, link them to patients, and persist summaries and extracted context." />
      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload document</CardTitle>
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
                  <Select name="docType" defaultValue="LAB_REPORT">
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
        <div className="space-y-4">
          {documents.length === 0 ? (
            <EmptyState title="No documents yet" description="Upload a patient report, SOP, or internal note to start the document intelligence flow." />
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
