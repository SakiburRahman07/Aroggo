import Link from "next/link";
import { getDocumentDetail } from "@/features/documents/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireWorkspaceContext } from "@/lib/auth/session";

export default async function DocumentDetailPage({ params }: { params: Promise<{ workspaceSlug: string; documentId: string }> }) {
  const { workspaceSlug, documentId } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "documents:read");
  const document = await getDocumentDetail(workspace.id, documentId);

  if (!document) {
    return <div className="text-sm text-muted-foreground">Document not found.</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Document detail"
        title={document.title}
        description={`${document.docType.replaceAll("_", " ")} • ${document.patient?.fullName ?? "Workspace document"}`}
        actions={
          document.signedUrl ? (
            <Button asChild variant="outline">
              <Link href={document.signedUrl}>Open file</Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>{document.summary ?? "No summary available yet."}</p>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="font-medium text-slate-950">Structured extraction</p>
              <pre className="mt-3 overflow-auto text-xs text-muted-foreground">{JSON.stringify(document.extractedJson ?? {}, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Extracted text</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[560px] overflow-auto rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              {document.extractedText ?? "No extracted text stored for this document."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

