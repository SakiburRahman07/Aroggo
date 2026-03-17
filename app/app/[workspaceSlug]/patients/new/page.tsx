import { createPatientAction } from "@/features/patients/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewPatientPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const createAction = createPatientAction.bind(null, workspaceSlug);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Patients" title="Register patient" description="Create a patient profile that can be linked to appointments, visits, tasks, and documents." />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Patient intake</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Full name</label>
              <Input name="fullName" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date of birth</label>
              <Input name="dob" type="date" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Gender</label>
              <Select name="gender" defaultValue="UNDISCLOSED">
                <option value="UNDISCLOSED">Undisclosed</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <Input name="phone" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input name="email" type="email" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Address</label>
              <Input name="address" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Emergency contact</label>
              <Input name="emergencyContact" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Textarea name="notes" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Create patient</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

