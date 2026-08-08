import { Button } from "@/components/ui/button";
import { Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TranslationToggleButtonProps = {
  active: boolean;
  loading?: boolean;
  targetLangLabel?: string;
  onTranslate: () => void;
  onToggle: () => void;
  className?: string;
  dataTestId: string;
};

export function TranslationToggleButton({
  active,
  loading = false,
  targetLangLabel = "français",
  onTranslate,
  onToggle,
  className,
  dataTestId,
}: TranslationToggleButtonProps) {
  return (
    <Button
      type="button"
      variant="glass"
      className={cn("rounded-full text-white", active ? "border-primary/60 text-primary" : "", className)}
      onClick={active ? onToggle : onTranslate}
      data-testid={dataTestId}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
      {loading ? "Traduction..." : active ? `Version ${targetLangLabel} active` : `Traduire en ${targetLangLabel}`}
    </Button>
  );
}
