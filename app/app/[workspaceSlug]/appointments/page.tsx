import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listAppointments } from "@/features/appointments/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { appointmentStatusLabels } from "@/lib/security/permissions";
import { formatDateTime } from "@/lib/utils";

export default async function AppointmentsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace } = await requireWorkspaceContext(workspaceSlug, "appointments:read");
  const appointments = await listAppointments(workspace.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Appointments"
        title="Schedule and manage visits"
        description="Coordinate patient bookings, doctor capacity, and status updates in one place."
        actions={
          <Button asChild>
            <Link href={`/app/${workspaceSlug}/appointments/new`}>Book appointment</Link>
          </Button>
        }
      />
      {appointments.length === 0 ? (
        <EmptyState title="No appointments yet" description="Create the first appointment to kick off clinic workflow and visit management." actionHref={`/app/${workspaceSlug}/appointments/new`} actionLabel="Book appointment" />
      ) : (
        <div className="grid gap-4">
          {appointments.map((appointment) => (
            <Link key={appointment.id} href={`/app/${workspaceSlug}/appointments/${appointment.id}`}>
              <Card className="bg-white/90 transition hover:-translate-y-0.5">
                <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{appointment.patient.fullName}</p>
                    <p className="text-sm text-muted-foreground">{appointment.reason}</p>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{formatDateTime(appointment.scheduledAt)}</p>
                    <p>{appointment.doctor.profile?.fullName ?? appointment.doctor.email} • {appointmentStatusLabels[appointment.status]}</p>
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
