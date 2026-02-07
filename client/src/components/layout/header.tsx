import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { User, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/components/ui/command-palette";
import { useDataModeContext } from "@/components/providers/data-mode-provider";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { setOpen: setCommandPaletteOpen } = useCommandPalette();
  const { dataMode } = useDataModeContext();

  return (
    <header className="bg-card border-b border-border shrink-0">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 ml-12 md:ml-0">
            <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block truncate">
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:flex items-center gap-1.5 text-muted-foreground hover:text-foreground h-8 px-2"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Search"
            >
              <Command className="h-4 w-4" />
              <span className="text-xs font-medium">⌘K</span>
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            {dataMode === "demo" && (
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline max-w-[80px] truncate" data-testid="header-demo-indicator">
                Demo data
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
