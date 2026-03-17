import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Welcome back</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950">Sign in to your clinic workspace</h1>
        <p className="text-sm text-muted-foreground">Use your work email and password to continue.</p>
      </div>
      <Suspense fallback={<div className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">Loading sign-in form...</div>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-muted-foreground">
        Need an account? <Link className="font-medium text-primary" href="/signup">Create one</Link>
      </p>
    </div>
  );
}
