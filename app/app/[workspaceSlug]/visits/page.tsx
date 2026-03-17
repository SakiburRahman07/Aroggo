import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listVisits } from "@/features/visits/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default async function VisitsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, viewer } = await requireWorkspaceContext(workspaceSlug, "visits:read");
  const visits = await listVisits(workspace.id, viewer);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Visits" title="Visit records" description="Review visit notes, draft records, and follow-up status within your current scope." />
      {visits.length === 0 ? (
        <EmptyState title="No visits yet" description="Visit notes created from appointments will appear here when clinicians start documentation." />
      ) : (
        <div className="grid gap-4">
          {visits.map((visit) => (
            <Link key={visit.id} href={`/app/${workspaceSlug}/visits/${visit.id}`}>
              <Card className="bg-white/90 transition hover:-translate-y-0.5">
                <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{visit.patient.fullName}</p>
                    <p className="text-sm text-muted-foreground">{visit.status} - {visit.doctor.profile?.fullName ?? visit.doctor.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{formatDate(visit.createdAt)}</p>
                    <p>{visit.followUpDate ? `Follow-up ${formatRelativeTime(visit.followUpDate)}` : "No follow-up set"}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}