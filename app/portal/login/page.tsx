import { PortalLoginForm } from "@/components/forms/portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f7fffc_0%,_#edf5ff_100%)] px-4 py-10">
      <div className="mx-auto max-w-md rounded-[32px] border border-white/70 bg-white/90 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Aroggo Portal</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">Sign in to your patient portal</h1>
        <p className="mt-2 text-sm text-slate-600">Use the email address you were invited with to view appointments, updates, and your digital QR ID.</p>
        <div className="mt-8">
          <PortalLoginForm />
        </div>
      </div>
    </div>
  );
}
