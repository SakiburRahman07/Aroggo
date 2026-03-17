import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Password recovery</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We’ll email you a reset link if your account exists.</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

