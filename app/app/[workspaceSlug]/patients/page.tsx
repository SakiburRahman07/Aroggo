import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { listPatients, type PatientListItem } from "@/features/patients/service";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { patientReadPermissions, roleLabels } from "@/lib/security/permissions";
import { getScopedPatientAccess } from "@/lib/security/scopes";
import { formatDate } from "@/lib/utils";

export default async function PatientsPage({
  params,
  searchParams
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { workspaceSlug } = await params;
  const { q } = await searchParams;
  const { workspace, membership, viewer } = await requireWorkspaceContext(workspaceSlug, patientReadPermissions);
  const patientAccess = getScopedPatientAccess(membership.role);
  const patients = await listPatients(workspace.id, viewer, q);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Patients"
        title={membership.role === "DOCTOR" ? "My patient panel" : "Patient operations"}
        description={`Showing patient records for the ${roleLabels[membership.role]} view in this workspace.`}
        actions={
          patientAccess.canWriteBasic ? (
            <Button asChild>
              <Link href={`/app/${workspaceSlug}/patients/new`}>Register patient</Link>
            </Button>
          ) : undefined
        }
      />
      <form className="max-w-md">
        <Input name="q" defaultValue={q} placeholder="Search by name, code, or phone" />
      </form>
      {patients.length === 0 ? (
        <EmptyState
          title="No patients found"
          description="Patients in your current scope will appear here once intake or doctor-linked activity exists."
          actionHref={patientAccess.canWriteBasic ? `/app/${workspaceSlug}/patients/new` : undefined}
          actionLabel={patientAccess.canWriteBasic ? "Register patient" : undefined}
        />
      ) : (
        <div className="grid gap-4">
          {patients.map((patient: PatientListItem) => (
            <Link key={patient.id} href={`/app/${workspaceSlug}/patients/${patient.id}`}>
              <Card className="bg-white/90 transition hover:-translate-y-0.5">
                <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950">{patient.fullName}</p>
                    <p className="text-sm text-muted-foreground">{patient.patientCode} - {patient.phone}</p>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{patient.gender}</p>
                    <p>{patient.dob ? formatDate(patient.dob) : "DOB not recorded"}</p>
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
