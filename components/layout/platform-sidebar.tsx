"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, Bot, FileText, Headset, LayoutDashboard, Layers3, ShieldCheck, Users } from "lucide-react";
import { SignOutButton } from "@/components/layout/signout-button";
import { getPlatformNavigation, type NavIconKey } from "@/lib/security/navigation";
import { cn } from "@/lib/utils";

const iconMap: Record<NavIconKey, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  workspace: Layers3,
  users: Users,
  usage: Activity,
  logs: FileText,
  email: Bell,
  ai: Bot,
  support: Headset,
  patients: Users,
  appointments: LayoutDashboard,
  documents: FileText,
  tasks: LayoutDashboard,
  analytics: Activity,
  notifications: Bell,
  team: Users,
  settings: ShieldCheck,
  visits: LayoutDashboard
};

export function PlatformSidebar() {
  const pathname = usePathname();
  const navigation = getPlatformNavigation();

  return (
    <aside className="flex h-full w-full flex-col justify-between border-r border-border/70 bg-slate-950 px-4 py-5 text-white">
      <div className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">Aroggo Platform</p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">Super admin console</h2>
          <p className="mt-2 text-sm text-white/70">Monitor tenant health, delivery failures, AI usage, and support signals across the platform.</p>
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
                  active ? "bg-white text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white"
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
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
          Platform admin actions stay server-authorized and are intended for tenant support, observability, and operations oversight.
        </div>
        <SignOutButton className="border-white/20 bg-white text-slate-950 hover:bg-white/90" />
      </div>
    </aside>
  );
}