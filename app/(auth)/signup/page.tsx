import Link from "next/link";
import { db } from "@/lib/db/prisma";
import { roleLabels } from "@/lib/security/permissions";
import { SignupForm } from "@/components/forms/signup-form";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  const inviteToken = params.invite;
  const invite = inviteToken
    ? await db.workspaceInvite.findUnique({
        where: { token: inviteToken },
        include: { workspace: true }
      })
    : null;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Get started</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">
          {invite ? "Join your clinic workspace" : "Create your clinic workspace"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {invite
            ? "Complete your account setup to accept the workspace invitation."
            : "Launch OpsPilot Health with secure multi-tenant foundations from day one."}
        </p>
      </div>
      <SignupForm
        inviteToken={invite?.token}
        inviteEmail={invite?.email}
        workspaceName={invite?.workspace.name}
        roleLabel={invite ? roleLabels[invite.role] : undefined}
      />
      <p className="text-sm text-muted-foreground">
        Already have an account? <Link className="font-medium text-primary" href="/login">Sign in</Link>
      </p>
    </div>
  );
}
