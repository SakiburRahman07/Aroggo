import { CheckCircle2, Clock3, FileText, Sparkles, Users2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Clinic operations hub",
    description: "Manage appointments, visits, follow-ups, and staff coordination from one tenant-secure workspace.",
    icon: Clock3
  },
  {
    title: "AI-assisted documentation",
    description: "Summarize reports, draft visit notes, and turn unstructured notes into operational tasks with reviewable AI outputs.",
    icon: Sparkles
  },
  {
    title: "Patient-linked knowledge",
    description: "Store documents, extract structured context, and retrieve the right information without searching across disconnected tools.",
    icon: FileText
  },
  {
    title: "Team workspace built for clinics",
    description: "Keep doctors, receptionists, lab staff, and operations leaders aligned on live work and accountability.",
    icon: Users2
  }
];

const outcomes = [
  "Reduce manual admin load",
  "Keep patient context in one place",
  "Coordinate work across departments",
  "Make AI useful beyond a chatbot demo"
];

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            Built for clinics that need operational clarity
          </div>
          <div className="space-y-6">
            <h1 className="max-w-3xl font-display text-5xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              Run the clinic. Coordinate the team. Put AI to work on the admin load.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              OpsPilot Health is a clinic operations and team workspace platform that combines scheduling, patient-linked documents, internal collaboration, and grounded AI assistance in one product-grade SaaS experience.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Launch your workspace</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/features">Explore capabilities</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {outcomes.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-white/70 px-4 py-3 text-sm text-slate-700 shadow-soft">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_28%)]" />
          <Card className="overflow-hidden border-white/70 bg-white/90">
            <CardHeader>
              <CardTitle>Today inside OpsPilot Health</CardTitle>
              <CardDescription>One workspace for clinic operations, patient context, and team execution.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="text-sm text-white/70">Appointments today</p>
                  <p className="mt-3 text-4xl font-semibold">28</p>
                  <p className="mt-2 text-sm text-white/70">4 awaiting confirmation</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-5">
                  <p className="text-sm text-emerald-700">AI processing queue</p>
                  <p className="mt-3 text-4xl font-semibold text-emerald-950">6</p>
                  <p className="mt-2 text-sm text-emerald-700">2 reports ready for review</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 p-5">
                <p className="text-sm font-medium text-slate-950">Operational summary</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Follow-up backlog is climbing in cardiology, two lab uploads need approval, and front desk coverage is tight during the afternoon peak. AI-generated drafts are available for three visits and one meeting note.
                </p>
              </div>
              <div className="grid gap-3">
                {pillars.slice(0, 2).map((pillar) => (
                  <div key={pillar.title} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <pillar.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">{pillar.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{pillar.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-8 max-w-2xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Platform pillars</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">A serious clinic-tech workflow platform, not a lightweight admin demo.</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {pillars.map((pillar) => (
            <Card key={pillar.title} className="bg-white/85">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <pillar.icon className="h-5 w-5" />
                </div>
                <CardTitle>{pillar.title}</CardTitle>
                <CardDescription>{pillar.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

