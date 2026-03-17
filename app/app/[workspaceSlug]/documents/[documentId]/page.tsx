import Link from "next/link";
import { getDocumentDetail } from "@/features/documents/service";
import { releaseDocumentToPatientAction } from "@/features/patient-portal/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { documentReadPermissions } from "@/lib/security/permissions";
import { getScopedDocumentAccess } from "@/lib/security/scopes";

export default async function DocumentDetailPage({ params }: { params: Promise<{ workspaceSlug: string; documentId: string }> }) {
  const { workspaceSlug, documentId } = await params;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, documentReadPermissions);
  const documentAccess = getScopedDocumentAccess(membership.role);
  const document = await getDocumentDetail(workspace.id, documentId, viewer);

  if (!document) {
    return <div className="text-sm text-muted-foreground">Document not found.</div>;
  }

  const releaseAction = releaseDocumentToPatientAction.bind(null, workspaceSlug, documentId, !document.releasedToPatient);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Document detail"
        title={document.title}
        description={`${document.docType.replaceAll("_", " ")} - ${document.patient?.fullName ?? "Workspace document"}`}
        actions={
          <div className="flex gap-3">
            <form action={releaseAction}>
              <Button type="submit" variant="outline">{document.releasedToPatient ? "Unrelease from portal" : "Release to portal"}</Button>
            </form>
            {document.signedUrl ? (
              <Button asChild variant="outline">
                <Link href={document.signedUrl}>Open file</Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>{document.summary ?? "No summary available yet."}</p>
            <div className="rounded-2xl bg-teal-50 p-4 text-teal-900">Patient portal state: {document.releasedToPatient ? "Released" : "Internal only"}</div>
            {documentAccess.showStructuredExtraction ? (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <p className="font-medium text-slate-950">Structured extraction</p>
                <pre className="mt-3 overflow-auto text-xs text-muted-foreground">{JSON.stringify(document.extractedJson ?? {}, null, 2)}</pre>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                Structured extraction details are limited for your role. Review the summary and original file instead.
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{documentAccess.showRawText ? "Extracted text" : "Access scope"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[560px] overflow-auto rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              {documentAccess.showRawText ? document.extractedText ?? "No extracted text stored for this document." : "Your role can review the summary and original file, but raw extracted text is not shown in this view."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
