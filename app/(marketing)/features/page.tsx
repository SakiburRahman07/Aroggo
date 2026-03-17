import { Bot, CalendarClock, FileSearch, ShieldCheck, Users2, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Workspace and team operations",
    description: "Role-aware workspaces, member invites, internal tasking, announcements, and notifications designed for clinics.",
    icon: Users2
  },
  {
    title: "Patient operations",
    description: "Registration, searchable profiles, appointment scheduling, visit records, follow-up tracking, and timeline context.",
    icon: CalendarClock
  },
  {
    title: "Document intelligence",
    description: "Secure uploads, text extraction, summaries, structured metadata, and retrieval-ready chunking for patient and workspace documents.",
    icon: FileSearch
  },
  {
    title: "Grounded AI assistant",
    description: "Summaries, drafts, meeting-note-to-task flows, and document Q&A constrained to the workspace data users are authorized to access.",
    icon: Bot
  },
  {
    title: "Operational visibility",
    description: "Appointment metrics, task bottlenecks, follow-up backlog, processing status, and AI usage reporting in one dashboard.",
    icon: Workflow
  },
  {
    title: "Security-first architecture",
    description: "Tenant isolation, server-side authorization, audit logs, protected document access, and maintainable modular monolith boundaries.",
    icon: ShieldCheck
  }
];

export default function FeaturesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Capabilities</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-slate-950">Everything OpsPilot Health ships in the first production-minded version.</h1>
        <p className="text-lg leading-8 text-slate-600">
          The product is designed as a serious clinic operations platform with a cohesive AI layer, not a disconnected collection of admin pages.
        </p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="bg-white/85">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm leading-7 text-muted-foreground">
              Built for maintainable growth with domain services, Prisma modeling, secure server-side actions, and external integrations for email, storage, and AI.
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
