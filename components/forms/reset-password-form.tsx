"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
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
        const password = String(formData.get("password") ?? "");

        startTransition(async () => {
          const response = await fetch("/api/auth/password/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password })
          });

          const result = (await response.json()) as { error?: string };

          if (!response.ok) {
            setError(result.error ?? "Unable to reset password.");
            return;
          }

          router.push("/login?reset=1");
        });
      }}
    >
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          New password
        </label>
        <Input id="password" name="password" type="password" placeholder="Create a new password" required />
      </div>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Updating password..." : "Reset password"}
      </Button>
    </form>
  );
}
