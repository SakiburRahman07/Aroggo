import Link from "next/link";
import { MarketingHeader } from "@/components/layout/marketing-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      {children}
      <footer className="border-t border-border/60 bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>OpsPilot Health helps clinics run calmer, more coordinated operations.</p>
          <div className="flex items-center gap-4">
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/signup">Start free</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
