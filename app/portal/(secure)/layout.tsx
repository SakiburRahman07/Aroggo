import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarDays, CreditCard, FileText, ShieldCheck, UserRound } from "lucide-react";
import { requirePatientPortalContext } from "@/lib/auth/session";

const navItems = [
  { href: "/portal/profile", label: "Profile", icon: UserRound },
  { href: "/portal/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/portal/documents", label: "Documents", icon: FileText },
  { href: "/portal/notifications", label: "Notifications", icon: Bell },
  { href: "/portal/qr", label: "QR ID", icon: CreditCard },
  { href: "/portal/check-in", label: "Check-in", icon: ShieldCheck }
] as const;

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { patient, workspace } = await requirePatientPortalContext();

  if (!patient.portalEnabled) {
    redirect("/portal/login");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.16),_transparent_42%),linear-gradient(180deg,_#f6fffd_0%,_#eef7ff_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-6">
        <header className="rounded-[32px] border border-white/70 bg-white/85 px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Patient Portal</p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">{workspace.name}</h1>
              <p className="mt-1 text-sm text-slate-600">Hello, {patient.fullName}. Review appointments, released updates, and your digital patient ID.</p>
            </div>
            <div className="rounded-3xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
              <p className="font-medium">Patient ID</p>
              <p>{patient.patientCode}</p>
            </div>
          </div>
        </header>
        <div className="mt-6 grid gap-6 md:grid-cols-[240px_1fr]">
          <aside className="rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-teal-50 hover:text-teal-900">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
