import { activatePatientPortalInviteAction } from "@/features/patient-portal/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function PortalActivatePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return <div className="p-8 text-sm text-muted-foreground">Activation token is missing.</div>;
  }

  const action = activatePatientPortalInviteAction.bind(null, token);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7fffc_0%,_#edf5ff_100%)] px-4 py-10">
      <div className="mx-auto max-w-md">
        <Card className="rounded-[32px] border-white/70 bg-white/90">
          <CardHeader><CardTitle>Activate patient portal</CardTitle></CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <Input name="fullName" placeholder="Your full name" required />
              <Input name="password" type="password" placeholder="Create password" required />
              <Button type="submit" className="w-full">Activate portal access</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
