"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SignupFormProps {
  inviteToken?: string;
  inviteEmail?: string;
  workspaceName?: string;
  roleLabel?: string;
}

export function SignupForm({ inviteToken, inviteEmail, workspaceName, roleLabel }: SignupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        const payload = {
          fullName: String(formData.get("fullName") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          workspaceName: String(formData.get("workspaceName") ?? ""),
          timezone: String(formData.get("timezone") ?? "Asia/Dhaka"),
          inviteToken: inviteToken ?? undefined
        };

        startTransition(async () => {
          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          const result = (await response.json()) as { error?: string; redirectTo?: string };

          if (!response.ok) {
            setError(result.error ?? "Unable to create your account.");
            return;
          }

          const signInResult = await signIn("credentials", {
            email: payload.email,
            password: payload.password,
            redirect: false
          });

          if (signInResult?.error) {
            router.push(`/login?created=1&email=${encodeURIComponent(payload.email)}`);
            return;
          }

          router.push(result.redirectTo ?? "/app");
          router.refresh();
        });
      }}
    >
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
          Full name
        </label>
        <Input id="fullName" name="fullName" placeholder="Dr. Sarah Ahmed" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Work email
        </label>
        <Input id="email" name="email" type="email" defaultValue={inviteEmail} readOnly={Boolean(inviteEmail)} placeholder="team@clinic.com" required />
      </div>
      {!inviteToken ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="workspaceName">
            Clinic workspace name
          </label>
          <Input id="workspaceName" name="workspaceName" placeholder="North Avenue Family Care" required={!inviteToken} />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Joining <span className="font-semibold text-slate-950">{workspaceName}</span> as <span className="font-semibold text-slate-950">{roleLabel}</span>
        </div>
      )}
      <input type="hidden" name="timezone" value="Asia/Dhaka" />
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" placeholder="Create a secure password" required />
      </div>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Creating workspace..." : inviteToken ? "Join workspace" : "Create workspace"}
      </Button>
    </form>
  );
}
