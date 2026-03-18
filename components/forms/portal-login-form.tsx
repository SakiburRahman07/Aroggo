"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PortalLoginFormProps = {
  callbackUrl?: string;
  email?: string;
  activated?: boolean;
  activationRequired?: boolean;
  invalidQr?: boolean;
};

export function PortalLoginForm({
  callbackUrl = "/portal",
  email = "",
  activated = false,
  activationRequired = false,
  invalidQr = false
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
          const response = await signIn("credentials", {
            email: submittedEmail,
            password,
            redirect: false
          });

          if (response?.error) {
            setError("Incorrect portal email or password.");
            return;
          }

          router.push(callbackUrl);
          router.refresh();
        });
      }}
    >
      {activated ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Portal access activated. Sign in to continue.</div> : null}
      {activationRequired ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Portal not activated yet. Use the activation link from your clinic invitation email, or ask the clinic to resend or share the activation link manually.</div> : null}
      {invalidQr ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">This QR code could not open the portal directly. If your portal is not activated yet, use your invitation link first.</div> : null}
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
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in to portal"}
      </Button>
    </form>
  );
}
