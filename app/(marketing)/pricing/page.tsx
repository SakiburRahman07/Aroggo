import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const tiers = [
  {
    name: "Starter Clinic",
    price: "$149",
    description: "For single-location clinics replacing fragmented admin workflows.",
    features: ["Up to 10 seats", "Patients, appointments, tasks", "Document uploads and summaries", "Email notifications"]
  },
  {
    name: "Growth Clinic",
    price: "$399",
    description: "For multi-team clinics needing analytics, AI workflows, and stronger operational coordination.",
    features: ["Up to 40 seats", "Grounded AI assistant", "Advanced analytics", "Operational summary workflows", "Priority onboarding"]
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large healthcare operations requiring tailored controls, onboarding, and support.",
    features: ["Custom seat tiers", "Dedicated implementation", "Security review support", "Advanced integrations"]
  }
];

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary">Pricing</p>
        <h1 className="font-display text-5xl font-semibold tracking-tight text-slate-950">Flexible plans for clinics that want serious operational leverage.</h1>
        <p className="text-lg leading-8 text-slate-600">
          Pricing is structured like a real SaaS business with room for future billing and usage controls. The current build includes a billing placeholder inside workspace settings.
        </p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {tiers.map((tier, index) => (
          <Card key={tier.name} className={index === 1 ? "border-primary bg-white" : "bg-white/85"}>
            <CardHeader>
              <CardTitle>{tier.name}</CardTitle>
              <div className="space-y-2">
                <p className="text-4xl font-semibold tracking-tight text-slate-950">{tier.price}<span className="text-base font-medium text-muted-foreground">/month</span></p>
                <p className="text-sm leading-6 text-muted-foreground">{tier.description}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </div>
                ))}
              </div>
              <Button className="w-full" variant={index === 1 ? "default" : "outline"} asChild>
                <Link href="/signup">Start with {tier.name}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

