import { ShieldCheck, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
      <div className="hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4" />
            OpsPilot Health
          </div>
          <div className="space-y-4">
            <h1 className="font-display text-5xl font-semibold tracking-tight">AI-powered clinic operations and team workspace platform</h1>
            <p className="max-w-xl text-lg leading-8 text-white/75">
              Bring scheduling, patient records, internal coordination, document intelligence, and reviewable AI workflows into one secure clinic workspace.
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold">Security-minded by default</p>
              <p className="text-sm leading-7 text-white/75">
                Workspace-scoped access, role checks, audit logs, protected document links, and server-side validation anchor the platform.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-[2rem] border border-border/70 bg-white/85 p-8 shadow-soft backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
