import { ShieldCheck } from "lucide-react";
import { PlatformSidebar } from "@/components/layout/platform-sidebar";
import { requirePlatformAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-100 md:grid md:grid-cols-[288px_1fr]">
      <div className="hidden md:block">
        <PlatformSidebar />
      </div>
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border/70 bg-white/90 backdrop-blur-xl">
          <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Platform admin</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-950">Aroggo control center</h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Platform-wide monitoring and support controls
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}