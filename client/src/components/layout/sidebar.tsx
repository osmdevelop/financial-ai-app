import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { BarChart3, Briefcase, Brain, Newspaper, Calendar, TrendingUp, Settings, HelpCircle, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase },
  { name: "AI Insights", href: "/insights", icon: Brain },
  { name: "Headlines", href: "/headlines", icon: Newspaper },
  { name: "Earnings", href: "/earnings", icon: TrendingUp },
  { name: "Economic Calendar", href: "/economic-calendar", icon: Calendar },
];

const secondaryNavigation = [
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
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
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
          className="fixed top-4 left-4 z-50 md:hidden"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      )}
      
      {/* Overlay for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-card shadow-lg border-r border-border transition-transform duration-300 ease-in-out z-50",
        isMobile ? (
          cn(
            "fixed inset-y-0 left-0 w-64 transform",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )
        ) : "w-64 relative"
      )}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="text-primary-foreground text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FinanceTracker</h1>
            <p className="text-sm text-muted-foreground">Portfolio Intelligence</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        <div className="px-6 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Menu</h3>
        </div>
        <ul className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <span 
                    onClick={closeSidebar}
                    className={cn(
                      "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="px-6 py-2 mt-8">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account</h3>
        </div>
        <ul className="space-y-1 px-3">
          {secondaryNavigation.map((item) => (
            <li key={item.name}>
              <Link href={item.href}>
                <span 
                  onClick={closeSidebar}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <item.icon className="mr-3 h-4 w-4" />
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
