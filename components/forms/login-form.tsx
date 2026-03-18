"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const created = searchParams.get("created") === "1";
  const reset = searchParams.get("reset") === "1";
  const qrError = searchParams.get("error");

  const qrMessage =
    qrError === "unauthorized"
      ? "You are signed in, but this patient is not in your current access scope. For doctors, the patient usually needs to be assigned to your appointment or visit workflow first."
      : qrError === "revoked"
        ? "This QR code has been revoked. Ask clinic staff to issue a new patient QR code."
        : qrError === "expired"
          ? "This QR code has expired. Ask clinic staff to generate a fresh QR code."
          : qrError === "session"
            ? "Your session expired before the QR could be resolved. Sign in again and retry the scan."
            : qrError === "workflow"
              ? "The patient QR was found, but the workflow could not be resolved safely. Try again or use manual patient search."
              : qrError === "invalid"
                ? "This QR code could not be resolved. Check that the QR is current and belongs to an active patient record."
                : null;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");

        startTransition(async () => {
          const response = await signIn("credentials", {
            email,
            password,
            redirect: false
          });

          if (response?.error) {
            setError("Incorrect email or password.");
            return;
          }

          router.push("/app");
          router.refresh();
        });
      }}
    >
      {created ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Account created. You can sign in now.</div> : null}
      {reset ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Password updated. Sign in with your new password.</div> : null}
      {qrMessage ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{qrMessage}</div> : null}
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Work email
        </label>
        <Input id="email" name="email" type="email" placeholder="team@clinic.com" defaultValue={searchParams.get("email") ?? ""} required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-primary">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" placeholder="Enter your password" required />
      </div>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
