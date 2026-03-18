"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInToAuthSurface } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FieldErrors = Record<string, string[]>;
type ApiResponse = {
  ok?: boolean;
  data?: {
    redirectTo?: string;
  };
  error?: {
    message?: string;
    fieldErrors?: FieldErrors;
  };
};

interface SignupFormProps {
  inviteToken?: string;
  inviteEmail?: string;
  workspaceName?: string;
  roleLabel?: string;
}

function getFieldError(fieldErrors: FieldErrors, field: string) {
  return fieldErrors[field]?.[0] ?? null;
}

export function SignupForm({ inviteToken, inviteEmail, workspaceName, roleLabel }: SignupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setFieldErrors({});
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
          try {
            const response = await fetch("/api/auth/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });

            const result = (await response.json()) as ApiResponse;

            if (!response.ok) {
              setFieldErrors(result.error?.fieldErrors ?? {});
              setError(result.error?.message ?? "Unable to create your account.");
              return;
            }

            const signInResult = await signInToAuthSurface({
              surface: "staff",
              email: payload.email,
              password: payload.password,
              callbackUrl: result.data?.redirectTo ?? "/app"
            });

            if (signInResult.error) {
              router.push(`/login?created=1&email=${encodeURIComponent(payload.email)}`);
              return;
            }

            router.push(signInResult.url ?? result.data?.redirectTo ?? "/app");
            router.refresh();
          } catch {
            setError("We could not finish creating your account right now. Please try again.");
          }
        });
      }}
    >
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="fullName">
          Full name
        </label>
        <Input id="fullName" name="fullName" placeholder="Sarah Ahmed" required aria-invalid={Boolean(getFieldError(fieldErrors, "fullName"))} />
        {getFieldError(fieldErrors, "fullName") ? <p className="text-sm text-red-700">{getFieldError(fieldErrors, "fullName")}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Work email
        </label>
        <Input id="email" name="email" type="email" defaultValue={inviteEmail} readOnly={Boolean(inviteEmail)} placeholder="team@clinic.com" required aria-invalid={Boolean(getFieldError(fieldErrors, "email"))} />
        {getFieldError(fieldErrors, "email") ? <p className="text-sm text-red-700">{getFieldError(fieldErrors, "email")}</p> : null}
      </div>
      {!inviteToken ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="workspaceName">
            Clinic workspace name
          </label>
          <Input id="workspaceName" name="workspaceName" placeholder="North Avenue Family Care" required={!inviteToken} aria-invalid={Boolean(getFieldError(fieldErrors, "workspaceName"))} />
          {getFieldError(fieldErrors, "workspaceName") ? <p className="text-sm text-red-700">{getFieldError(fieldErrors, "workspaceName")}</p> : null}
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
        <Input id="password" name="password" type="password" placeholder="Create a secure password" required aria-invalid={Boolean(getFieldError(fieldErrors, "password"))} />
        {getFieldError(fieldErrors, "password") ? <p className="text-sm text-red-700">{getFieldError(fieldErrors, "password")}</p> : null}
      </div>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Creating workspace..." : inviteToken ? "Join workspace" : "Create workspace"}
      </Button>
    </form>
  );
}
