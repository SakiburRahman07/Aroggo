"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, CalendarClock, FileText, LayoutDashboard, Settings, Stethoscope, Users, UserSquare2, CheckSquare2, BarChart3 } from "lucide-react";
import { type Membership, type Workspace } from "@prisma/client";
import { roleLabels } from "@/lib/security/permissions";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/layout/signout-button";

const navigation = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: UserSquare2 },
  { label: "Appointments", href: "/appointments", icon: CalendarClock },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Tasks", href: "/tasks", icon: CheckSquare2 },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings }
] as const;

interface AppSidebarProps {
  workspace: Workspace;
  membership: Membership;
  workspaces: Array<{ workspace: Workspace }>;
}

export function AppSidebar({ workspace, membership, workspaces }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col justify-between border-r border-border/70 bg-white/80 px-4 py-5 backdrop-blur-xl">
      <div className="space-y-6">
        <div className="rounded-3xl bg-slate-950 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{workspace.name}</p>
              <p className="text-xs text-white/70">{roleLabels[membership.role]}</p>
            </div>
          </div>
          {workspaces.length > 1 ? (
            <div className="mt-4 rounded-2xl bg-white/10 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/60">Workspaces</p>
              <div className="space-y-1.5">
                {workspaces.map(({ workspace: item }) => (
                  <Link key={item.id} href={`/app/${item.slug}`} className="block rounded-xl px-3 py-2 text-sm transition hover:bg-white/10">
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const href = `/app/${workspace.slug}${item.href}`;
            const active = pathname === href || (item.href && pathname.startsWith(`${href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                  active ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-muted hover:text-slate-950"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl border border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
          AI features are grounded in your clinic data and designed for documentation support, not diagnosis.
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}

