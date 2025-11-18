import { ThemeToggle } from "@/components/ui/theme-toggle";
import { User } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {

  return (
    <header className="bg-card shadow-sm border-b border-border px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 md:flex-none ml-16 md:ml-0">
          <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="text-muted-foreground text-sm" />
            </div>
            <span className="text-sm text-foreground font-medium hidden sm:inline">Demo User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
