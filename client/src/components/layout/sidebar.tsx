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
  HelpCircle,
  Menu,
  X,
  Activity,
  Search,
  Globe,
  Target,
  Scale,
  FlaskConical,
  FileText,
  Star,
  Bell,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Daily Brief", href: "/", icon: FileText, isPrimary: true },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Market Drivers", href: "/today", icon: Target },
  { name: "AI Insights", href: "/insights", icon: Brain },
  { name: "Sentiment", href: "/sentiment", icon: Activity },
  { name: "News Stream", href: "/news", icon: Newspaper },
  { name: "Asset Overview", href: "/asset-overview", icon: Search },
  { name: "Watchlist", href: "/watchlist", icon: Star },
  { name: "Market Recap", href: "/market-recap", icon: Globe },
  { name: "Earnings", href: "/earnings", icon: TrendingUp },
  { name: "Economic Calendar", href: "/economic-calendar", icon: Calendar },
  { name: "Events Intelligence", href: "/events", icon: Activity },
  { name: "Policy & Politics", href: "/policy", icon: Scale },
  { name: "Scenario Studio", href: "/scenario", icon: FlaskConical },
];

const secondaryNavigation = [
  { name: "History", href: "/history", icon: History },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help", href: "/help", icon: HelpCircle },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      {isMobile && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="icon"
          className="fixed top-6 left-6 z-50 md:hidden glass hover-glow transition-all duration-300"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "glass-strong shadow-elegant border-r border-border/30 transition-all duration-500 ease-out z-50 animate-fade-in",
          isMobile
            ? cn(
                "fixed inset-y-0 left-0 w-72 transform",
                isOpen ? "translate-x-0" : "-translate-x-full",
              )
            : "w-72 relative",
        )}
      >
        <div className="p-8 border-b border-border/20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-glow hover-glow animate-float">
              <BarChart3 className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">OSM Fin</h1>
              <p className="text-sm text-muted-foreground font-medium">Market Research</p>
            </div>
          </div>
        </div>

        <nav className="mt-8">
          <div className="px-8 py-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Navigation
            </h3>
          </div>
          <ul className="space-y-2 px-4">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href === "/" && location === "/daily-brief");
              const isPrimary = 'isPrimary' in item && item.isPrimary;
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <span
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer hover-lift",
                        isActive
                          ? "gradient-primary text-primary-foreground shadow-glow"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:shadow-elegant",
                      )}
                    >
                      <item.icon className="mr-4 h-5 w-5" />
                      {item.name}
                      {isPrimary && !isActive && (
                        <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="px-8 py-3 mt-10">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Account
            </h3>
          </div>
          <ul className="space-y-2 px-4">
            {secondaryNavigation.map((item) => (
              <li key={item.name}>
                <Link href={item.href}>
                  <span
                    onClick={closeSidebar}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent/50 hover:shadow-elegant flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer hover-lift"
                  >
                    <item.icon className="mr-4 h-5 w-5" />
                    {item.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
