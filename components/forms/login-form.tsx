"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInToAuthSurface } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const created = searchParams.get("created") === "1";
  const reset = searchParams.get("reset") === "1";
  const invalidQr = searchParams.get("error") === "invalid";
  const unauthorizedQr = searchParams.get("error") === "unauthorized";
  const revokedQr = searchParams.get("error") === "revoked";
  const expiredQr = searchParams.get("error") === "expired";

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
          try {
            const response = await signInToAuthSurface({
              surface: "staff",
              email,
              password,
              callbackUrl: "/app"
            });

            if (response.error) {
              setError("Incorrect work email or password.");
              return;
            }

            router.push(response.url ?? "/app");
            router.refresh();
          } catch {
            setError("We could not sign you in right now. Please try again.");
          }
        });
      }}
    >
      {created ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Account created. You can sign in now.</div> : null}
      {reset ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Password updated. Sign in with your new password.</div> : null}
      {unauthorizedQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">You are signed in, but this patient is not in your current access scope. For doctors, the patient usually needs to be assigned to your appointment or visit workflow first.</div> : null}
      {invalidQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This QR code could not be resolved. Check that the QR is current and belongs to an active patient record.</div> : null}
      {revokedQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This QR code has been revoked. Ask the clinic team to issue a fresh patient QR.</div> : null}
      {expiredQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This QR code has expired. Use the latest QR issued by the clinic or patient portal.</div> : null}
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
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Staff and portal sessions are isolated now, but browsers still share staff cookies across tabs in the same browser profile or incognito window. For two different staff accounts at once, use separate browser profiles or separate browsers.
      </div>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
