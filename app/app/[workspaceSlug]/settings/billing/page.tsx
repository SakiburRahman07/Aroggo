import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default async function BillingPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Billing" title="Billing placeholder" description="This first version keeps a clean seam for future Stripe or custom billing integration." />
      <Card>
        <CardHeader>
          <CardTitle>Planned billing capabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Future billing work can attach seat-based pricing, AI usage controls, invoice history, and subscription management without reworking the core workspace model.</p>
          <p>The current project focuses on secure product foundations, clinic operations, AI-assisted workflows, and maintainable modular architecture.</p>
        </CardContent>
      </Card>
    </div>
  );
}

