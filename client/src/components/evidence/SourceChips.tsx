import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceChipProps {
  label: string;
  href?: string;
  className?: string;
}

export function SourceChip({ label, href, className }: SourceChipProps) {
  const chipContent = (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 h-5 gap-1 font-normal bg-blue-500/10 text-blue-600 border-blue-500/30",
        href && "cursor-pointer hover:bg-blue-500/20",
        className
      )}
      data-testid="source-chip"
    >
      {label}
      {href && <ExternalLink className="h-2.5 w-2.5" />}
    </Badge>
  );

  if (href) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex"
      >
        {chipContent}
      </a>
    );
  }

  return chipContent;
}

interface SourceChipsProps {
  sources: Array<{ label: string; href?: string }>;
  maxVisible?: number;
  className?: string;
}

export function SourceChips({ sources, maxVisible = 3, className }: SourceChipsProps) {
  if (!sources || sources.length === 0) return null;

  const visible = sources.slice(0, maxVisible);
  const remaining = sources.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((source, idx) => (
        <SourceChip key={idx} label={source.label} href={source.href} />
      ))}
      {remaining > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground"
        >
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
