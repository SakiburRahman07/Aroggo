import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listAppointments } from "@/features/appointments/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { appointmentReadPermissions, appointmentStatusLabels } from "@/lib/security/permissions";
import { getScopedAppointmentAccess } from "@/lib/security/scopes";
import { formatDateTime } from "@/lib/utils";

export default async function AppointmentsPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, appointmentReadPermissions);
  const appointmentAccess = getScopedAppointmentAccess(membership.role);
  const appointments = await listAppointments(workspace.id, viewer);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Appointments"
        title={membership.role === "DOCTOR" ? "My schedule" : "Schedule and manage visits"}
        description="Coordinate bookings, doctor capacity, and patient flow inside the current workspace scope."
        actions={
          appointmentAccess.canWrite ? (
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/appointments/new`}>Book appointment</Link>
            </Button>
          ) : undefined
        }
      />
      {appointments.length === 0 ? (
        <EmptyState
          title="No appointments yet"
          description="Appointments in your current scope will appear here once scheduling starts."
          actionHref={appointmentAccess.canWrite ? `/app/${workspaceSlug}/appointments/new` : undefined}
          actionLabel={appointmentAccess.canWrite ? "Book appointment" : undefined}
        />
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
                    <p>{appointment.doctor.profile?.fullName ?? appointment.doctor.email} - {appointmentStatusLabels[appointment.status]}</p>
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