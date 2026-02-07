import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Shield, Eye, Layers, FileText } from "lucide-react";
import { Link } from "wouter";

export default function Product() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Product"
        subtitle="AI Market Intelligence with Evidence"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Hero */}
          <section className="animate-slide-up text-center py-6 md:py-10">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-3">
              When markets move, know exactly why
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-6">
              Regime, volatility, and policy risk in one place—with sources and confidence, not black boxes.
            </p>
            <Link href="/">
              <Button variant="default" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                Open Daily Brief
              </Button>
            </Link>
          </section>

          <section>
            <p className="text-muted-foreground">
              Context and regime awareness with clear provenance. Built for traders and researchers who want to know why a view is shown and how complete the inputs are.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Regime & Action Lens</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Market regime (Risk-On / Neutral / Risk-Off / Policy Shock) plus volatility (VIX or realized) and policy risk (Trump index + policy news intensity). Action Lens turns these into posture, playbook, and leverage guidance—informational only.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Evidence Mode</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Every key input shows source, basis, and status (Live / Cached / Partial / Unavailable / Demo). No black boxes: you see what drove the view and what was missing.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Data consistency</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Live vs Demo mode. In Live mode, no sample or fabricated data; empty states and retry when providers fail. Confidence and outputs are gated by input coverage so the app does not overstate certainty.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Cross-asset & narratives</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cross-asset regime view, per-asset “why it moved” narratives, earnings tone, options and on-chain signals. All designed for decision context, not raw data overload.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-foreground mb-2">Differentiation</h2>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Evidence-backed AI: citations and sources where applicable</li>
              <li>Policy risk as a first-class input (Trump index + policy news intensity)</li>
              <li>Real volatility (VIX / SPY realized), not sentiment-as-volatility</li>
              <li>Explainability and provenance for trust and compliance</li>
            </ul>
          </section>

          <section className="flex gap-2">
            <Link href="/">
              <span className="text-sm text-primary hover:underline">Daily Brief</span>
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href="/pricing">
              <span className="text-sm text-primary hover:underline">Pricing</span>
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
