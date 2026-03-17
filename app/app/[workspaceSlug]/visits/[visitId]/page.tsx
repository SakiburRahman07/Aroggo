import { generateVisitDraftAction, updateVisitAction } from "@/features/visits/actions";
import { getVisitDetail } from "@/features/visits/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireWorkspaceContext } from "@/lib/auth/session";

export default async function VisitDetailPage({ params }: { params: Promise<{ workspaceSlug: string; visitId: string }> }) {
  const { workspaceSlug, visitId } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "visits:read");
  const visit = await getVisitDetail(workspace.id, visitId);

  if (!visit) {
    return <div className="text-sm text-muted-foreground">Visit not found.</div>;
  }

  const updateAction = updateVisitAction.bind(null, workspaceSlug, visitId);
  const draftAction = generateVisitDraftAction.bind(null, workspaceSlug, visitId);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Visit detail" title={visit.patient.fullName} description={visit.appointment ? `Linked to appointment ${visit.appointment.reason}` : "Standalone visit record"} />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Visit note</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Symptoms</label>
                <Textarea name="symptoms" defaultValue={visit.symptoms ?? ""} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Observations</label>
                <Textarea name="observations" defaultValue={visit.observations ?? ""} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Diagnosis notes</label>
                <Textarea name="diagnosisNote" defaultValue={visit.diagnosisNote ?? ""} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Prescription / care instructions</label>
                <Textarea name="prescriptionText" defaultValue={visit.prescriptionText ?? ""} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Follow-up date</label>
                  <input className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm" name="followUpDate" type="date" defaultValue={visit.followUpDate ? new Date(visit.followUpDate).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select name="status" defaultValue={visit.status}>
                    <option value="DRAFT">Draft</option>
                    <option value="COMPLETED">Completed</option>
                  </Select>
                </div>
              </div>
              <Button type="submit">Save visit note</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI drafting support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">Generate an editable documentation draft based on the current visit note. Review carefully before finalizing.</p>
            <form action={draftAction}>
              <Button type="submit" variant="outline">Generate AI draft</Button>
            </form>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 leading-7 text-muted-foreground">
              {visit.aiDraft ?? "No AI draft has been generated yet."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
