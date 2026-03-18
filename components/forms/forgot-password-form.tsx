"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldErrors = Record<string, string[]>;
type ApiResponse = {
  ok?: boolean;
  error?: {
    message?: string;
    fieldErrors?: FieldErrors;
  };
};

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setFieldErrors({});
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");

        startTransition(async () => {
          const response = await fetch("/api/auth/password/forgot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });

          const result = (await response.json()) as ApiResponse;

          if (!response.ok) {
            setFieldErrors(result.error?.fieldErrors ?? {});
            setError(result.error?.message ?? "Unable to send reset instructions.");
            return;
          }

          setMessage("If an account exists for this email, reset instructions have been sent.");
        });
      }}
    >
      {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Work email
        </label>
        <Input id="email" name="email" type="email" placeholder="team@clinic.com" required aria-invalid={Boolean(fieldErrors.email?.length)} />
        {fieldErrors.email?.[0] ? <p className="text-sm text-red-700">{fieldErrors.email[0]}</p> : null}
      </div>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Remembered it? <Link className="font-medium text-primary" href="/login">Back to sign in</Link>
      </p>
    </form>
  );
}
