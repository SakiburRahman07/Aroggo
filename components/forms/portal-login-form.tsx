"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInToAuthSurface } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PortalLoginFormProps = {
  callbackUrl?: string;
  email?: string;
  activated?: boolean;
  activationRequired?: boolean;
  invalidQr?: boolean;
  expiredQr?: boolean;
  revokedQr?: boolean;
  accountError?: boolean;
  unauthorizedQr?: boolean;
};

export function PortalLoginForm({
  callbackUrl = "/portal",
  email = "",
  activated = false,
  activationRequired = false,
  invalidQr = false,
  expiredQr = false,
  revokedQr = false,
  accountError = false,
  unauthorizedQr = false
}: PortalLoginFormProps) {
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
        const submittedEmail = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");

        startTransition(async () => {
          try {
            const response = await signInToAuthSurface({
              surface: "portal",
              email: submittedEmail,
              password,
              callbackUrl
            });

            if (response.error) {
              setError("Incorrect portal email or password, or this account does not have portal access yet.");
              return;
            }

            router.push(response.url ?? callbackUrl);
            router.refresh();
          } catch {
            setError("We could not sign you in to the portal right now. Please try again.");
          }
        });
      }}
    >
      {activated ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Portal access activated. Sign in to continue.</div> : null}
      {activationRequired ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Portal not activated yet. Use the activation link from your clinic invitation email, or ask the clinic to resend or share the activation link manually.</div> : null}
      {invalidQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This QR code could not open the portal directly. If your portal is not activated yet, use your invitation link first.</div> : null}
      {expiredQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This QR code has expired. Open the latest portal invitation or ask the clinic to issue a fresh one.</div> : null}
      {revokedQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This QR code has been revoked. Ask the clinic to share an active portal link instead.</div> : null}
      {unauthorizedQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This portal account cannot open that QR destination. Ask the clinic to confirm your portal access and share the latest link.</div> : null}
      {accountError ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Your portal session is missing or no longer allowed for this patient account. Sign in again with the invited portal email address.</div> : null}
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Portal email
        </label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" defaultValue={email} required />
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
      <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-900">
        Portal sign-in uses a different cookie from the staff workspace, so staff and patient sessions no longer overwrite each other. Tabs in the same browser still share one portal cookie, so two different portal accounts at once need separate browser profiles or separate browsers.
      </div>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in to portal"}
      </Button>
    </form>
  );
}
