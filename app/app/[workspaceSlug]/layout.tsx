import { CalendarDays } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { getUserWorkspaces, requireWorkspaceContext } from "@/lib/auth/session";

export default async function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const { workspace, membership } = await requireWorkspaceContext(workspaceSlug);
  const workspaces = await getUserWorkspaces();

  return (
    <div className="min-h-screen bg-transparent md:grid md:grid-cols-[288px_1fr]">
      <div className="hidden md:block">
        <AppSidebar workspace={workspace} membership={membership} workspaces={workspaces} />
      </div>
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border/70 bg-white/70 backdrop-blur-xl">
          <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Workspace</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-950">{workspace.name}</h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <CalendarDays className="h-4 w-4 text-primary" />
              {new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date())}
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

