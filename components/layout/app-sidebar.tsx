"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CalendarClock,
  CheckSquare2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Microscope,
  Settings,
  Stethoscope,
  UserSquare2,
  Users
} from "lucide-react";
import { type Membership, type Workspace } from "@prisma/client";
import { SignOutButton } from "@/components/layout/signout-button";
import { getDefaultDashboardRoute, getRoleNavigation, type NavIconKey } from "@/lib/security/navigation";
import { roleLabels } from "@/lib/security/permissions";
import { cn } from "@/lib/utils";

const iconMap: Record<NavIconKey, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  patients: UserSquare2,
  appointments: CalendarClock,
  documents: FileText,
  tasks: CheckSquare2,
  analytics: BarChart3,
  notifications: Bell,
  team: Users,
  settings: Settings,
  ai: Bot,
  visits: ClipboardList,
  workspace: LayoutDashboard,
  users: Users,
  usage: Activity,
  email: Bell,
  logs: FileText,
  support: Microscope
};

interface AppSidebarProps {
  workspace: Workspace;
  membership: Membership;
  workspaces: Array<Membership & { workspace: Workspace }>;
}

export function AppSidebar({ workspace, membership, workspaces }: AppSidebarProps) {
  const pathname = usePathname();
  const navigation = getRoleNavigation(membership.role, workspace.slug);

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
              <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/60">Workspace access</p>
              <div className="space-y-1.5">
                {workspaces.map((item) => (
                  <Link
                    key={item.id}
                    href={getDefaultDashboardRoute(item.role, item.workspace.slug)}
                    className="block rounded-xl px-3 py-2 text-sm transition hover:bg-white/10"
                  >
                    <span className="block font-medium">{item.workspace.name}</span>
                    <span className="text-xs text-white/60">{roleLabels[item.role]}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = iconMap[item.icon];
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.label}
                href={item.href}
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
          AI tools stay grounded in your clinic data and are intended for operations, coordination, and documentation support.
        </div>
        <SignOutButton />
      </div>
    </aside>
  );
}