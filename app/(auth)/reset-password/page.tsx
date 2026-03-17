import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;

  if (!params.token) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Reset link required</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">Missing reset token</h1>
          <p className="text-sm text-muted-foreground">Request a fresh reset link to continue.</p>
        </div>
        <Link href="/forgot-password" className="text-sm font-medium text-primary">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Choose a new password</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">Update your credentials</h1>
        <p className="text-sm text-muted-foreground">Create a fresh password for your OpsPilot Health account.</p>
      </div>
      <ResetPasswordForm token={params.token} />
    </div>
  );
}

