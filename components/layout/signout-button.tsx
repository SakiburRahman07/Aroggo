"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import type { AuthSurface } from "@/lib/auth/options";
import { signOutFromAuthSurface } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignOutButtonProps {
  surface?: AuthSurface;
  callbackUrl?: string;
  className?: string;
}

export function SignOutButton({ surface = "staff", callbackUrl, className }: SignOutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nextUrl = callbackUrl ?? (surface === "portal" ? "/portal/login" : "/login");

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        className={cn("w-full justify-start", className)}
        disabled={isPending}
        onClick={() => {
          setError(null);

          startTransition(async () => {
            try {
              const response = await signOutFromAuthSurface({
                surface,
                callbackUrl: nextUrl
              });

              if (!response.ok) {
                setError("Unable to sign out right now.");
                return;
              }

              router.push(response.url);
              router.refresh();
            } catch {
              setError("Unable to sign out right now.");
            }
          });
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isPending ? "Signing out..." : "Sign out"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
