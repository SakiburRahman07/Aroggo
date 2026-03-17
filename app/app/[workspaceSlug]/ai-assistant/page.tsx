import { askGroundedQuestionAction, confirmMeetingTasksAction, generateMeetingTasksAction } from "@/features/ai/actions";
import { listPatientOptions } from "@/features/patients/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { db } from "@/lib/db/prisma";
import { aiUsePermissions, taskWritePermissions } from "@/lib/security/permissions";
import { hasRequestedPermission } from "@/lib/security/permissions";

export default async function AiAssistantPage({
  params,
  searchParams
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ queryId?: string; draftId?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { queryId, draftId } = await searchParams;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, aiUsePermissions);
  const patients = await listPatientOptions(workspace.id, viewer);
  const canCreateTasks = hasRequestedPermission(membership.role, taskWritePermissions);
  const [query, draft] = await Promise.all([
    queryId
      ? db.aIQuery.findFirst({
          where: {
            id: queryId,
            workspaceId: workspace.id,
            userId: membership.userId
          }
        })
      : null,
    draftId
      ? db.aIQuery.findFirst({
          where: {
            id: draftId,
            workspaceId: workspace.id,
            userId: membership.userId
          }
        })
      : null
  ]);
  const askAction = askGroundedQuestionAction.bind(null, workspaceSlug);
  const noteAction = generateMeetingTasksAction.bind(null, workspaceSlug);
  const confirmAction = draft && canCreateTasks ? confirmMeetingTasksAction.bind(null, workspaceSlug, draft.id) : null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="AI Assistant" title="Grounded clinic operations AI" description="Use AI for document review, drafting, and task extraction with workspace-scoped context and explicit review steps." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Grounded Q&A</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={askAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ask a question</label>
                <Textarea name="question" placeholder="What follow-up items appear across this patient's recent records?" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Scope to patient (optional)</label>
                <Select name="patientId" defaultValue="">
                  <option value="">Entire workspace</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.fullName}</option>
                  ))}
                </Select>
              </div>
              <Button type="submit">Run grounded query</Button>
            </form>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              {query?.responseSummary ?? "Answers will appear here after you submit a grounded question."}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Meeting note to tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={noteAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Internal note or meeting transcript</label>
                <Textarea name="note" placeholder="Paste internal notes and let AI summarize action items." required />
              </div>
              <Button type="submit">Extract task suggestions</Button>
            </form>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              <p className="font-medium text-slate-950">Summary</p>
              <p className="mt-2">{draft?.responseSummary ?? "Suggested tasks and summary will appear here."}</p>
              {draft?.metadataJson ? (
                <pre className="mt-4 overflow-auto text-xs text-muted-foreground">{JSON.stringify(draft.metadataJson, null, 2)}</pre>
              ) : null}
            </div>
            {confirmAction ? (
              <form action={confirmAction}>
                <Button type="submit" variant="outline">Create tasks from suggestions</Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}