import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Brain,
  Newspaper,
  Calendar,
  TrendingUp,
  Settings,
  Menu,
  X,
  Activity,
  Search,
  Globe,
  Scale,
  FlaskConical,
  FileText,
  Star,
  Bell,
  History,
  Zap,
  LayoutGrid,
  Package,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const intelligenceNav = [
  { name: "Daily Brief", href: "/", icon: FileText, isPrimary: true },
  { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { name: "What Changed", href: "/history", icon: History },
];

const calendarAndNewsNav = [
  { name: "Economic Calendar", href: "/calendar", icon: Calendar },
  { name: "News & Headlines", href: "/news", icon: Newspaper },
];

const researchNav = [
  { name: "AI Insights", href: "/insights", icon: Brain },
  { name: "Sentiment", href: "/sentiment", icon: Activity },
  { name: "Policy & Trump Index", href: "/policy", icon: Scale },
  { name: "Scenario Studio", href: "/scenario", icon: FlaskConical },
];

const portfolioNav = [
  { name: "Watchlist", href: "/watchlist", icon: Star },
  { name: "Asset Overview", href: "/asset-overview", icon: Search },
  { name: "Market Recap", href: "/market-recap", icon: Globe },
  { name: "Earnings", href: "/earnings", icon: TrendingUp },
];

const companyNav = [
  { name: "Product", href: "/product", icon: Package },
  { name: "Pricing", href: "/pricing", icon: CreditCard },
];

const alertsNav = [
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Notifications", href: "/notifications", icon: Zap },
  { name: "Settings", href: "/settings", icon: Settings },
];

const navSections = [
  { label: "Intelligence", items: intelligenceNav },
  { label: "Calendar & News", items: calendarAndNewsNav },
  { label: "Research", items: researchNav },
  { label: "Portfolio", items: portfolioNav },
  { label: "Company", items: companyNav },
  { label: "Alerts & More", items: alertsNav },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const closeSidebar = () => isMobile && setIsOpen(false);

  return (
    <>
      {isMobile && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden border-border bg-card"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "border-r border-border bg-card transition-transform duration-200 z-50 flex flex-col w-56",
          isMobile ? "fixed inset-y-0 left-0" : "shrink-0",
          isMobile && !isOpen && "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border">
          <Link href="/">
            <span className="flex items-center gap-3 cursor-pointer" onClick={closeSidebar}>
              <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-sm">
                M
              </div>
              <div>
                <h1 className="text-base font-bold text-foreground tracking-tight">MRKT</h1>
                <p className="text-[11px] text-muted-foreground leading-tight max-w-[140px]">
                  When markets move, know exactly why
                </p>
              </div>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navSections.map((section) => (
            <div key={section.label} className="mb-4">
              <div className="px-2 mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.label}
                </span>
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    location === item.href || (item.href === "/" && location === "/daily-brief");
                  const primary = "isPrimary" in item && Boolean((item as { isPrimary?: boolean }).isPrimary);
                  return (
                    <li key={item.name}>
                      <Link href={item.href}>
                        <span
                          onClick={closeSidebar}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                            isActive
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.name}</span>
                          {primary && !isActive ? (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-foreground/50 shrink-0" />
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground px-2 text-center">
            Data: Alpha Vantage · CoinGecko · OpenAI
          </p>
        </div>
      </aside>
    </>
  );
}
