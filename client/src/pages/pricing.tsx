import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "wouter";

const plans = [
  {
    name: "Free",
    description: "Explore core intelligence with limited history.",
    features: [
      "Daily Brief & Action Lens",
      "Evidence Mode",
      "Regime, volatility, policy risk",
      "Economic calendar & headlines",
      "7-day history",
    ],
    cta: "Get started",
    href: "/",
    primary: false,
  },
  {
    name: "Pro",
    description: "For active traders and researchers.",
    features: [
      "Everything in Free",
      "Extended history & exports",
      "More alerts & notifications",
      "Priority data refresh",
    ],
    cta: "Coming soon",
    href: "/",
    primary: true,
  },
  {
    name: "Team",
    description: "Shared workspaces and compliance.",
    features: [
      "Everything in Pro",
      "Shared watchlists & briefs",
      "Audit logs",
      "SSO (e.g. Auth0)",
    ],
    cta: "Contact us",
    href: "/settings",
    primary: false,
  },
];

export default function Pricing() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Pricing"
        subtitle="Plans for individuals and teams"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground mb-8 text-center">
            Auth and billing will be added later. Below is the planned structure.
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.primary ? "border-primary shadow-md" : ""}
              >
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <Button variant={plan.primary ? "default" : "outline"} className="w-full" size="sm">
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-8 text-center">
            Pricing and limits are subject to change. Contact for enterprise or custom plans.
          </p>
        </div>
      </main>
    </div>
  );
}
