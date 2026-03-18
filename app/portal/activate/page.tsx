import { activatePatientPortalInviteAction } from "@/features/patient-portal/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function getActivationErrorCopy(error?: string) {
  switch (error) {
    case "full-name":
      return "Enter your full name using at least 2 characters.";
    case "password":
      return "Create a password with at least 8 characters.";
    case "token":
      return "This activation link is invalid or expired. Ask the clinic to resend your portal invitation.";
    case "staff-email":
      return "This email is already used by a clinic staff account. Ask the clinic to invite a patient email instead.";
    case "email-in-use":
      return "This email is already linked to another patient portal account. Ask the clinic to reset portal access if needed.";
    case "activation":
      return "Portal activation could not be completed. Please try again or ask the clinic to resend the invitation.";
    default:
      return null;
  }
}

export default async function PortalActivatePage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  if (!token) {
    return <div className="p-8 text-sm text-muted-foreground">Activation token is missing.</div>;
  }

  const action = activatePatientPortalInviteAction.bind(null, token);
  const errorMessage = getActivationErrorCopy(error);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7fffc_0%,_#edf5ff_100%)] px-4 py-10">
      <div className="mx-auto max-w-md">
        <Card className="rounded-[32px] border-white/70 bg-white/90">
          <CardHeader><CardTitle>Activate patient portal</CardTitle></CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              {errorMessage ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{errorMessage}</div> : null}
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
