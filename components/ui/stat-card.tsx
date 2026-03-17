import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning";
}

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        {hint ? (
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              tone === "default" && "bg-primary/10 text-primary",
              tone === "success" && "bg-emerald-100 text-emerald-700",
              tone === "warning" && "bg-amber-100 text-amber-700"
            )}
          >
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}

