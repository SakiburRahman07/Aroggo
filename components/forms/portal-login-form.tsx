"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/portal";
  const activated = searchParams.get("activated") === "1";

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
            setError("Incorrect portal email or password.");
            return;
          }

          router.push(callbackUrl);
          router.refresh();
        });
      }}
    >
      {activated ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Portal access activated. Sign in to continue.</div> : null}
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Portal email
        </label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" defaultValue={searchParams.get("email") ?? ""} required />
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
