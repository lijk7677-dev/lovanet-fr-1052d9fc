import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const OPEN_PANEL_EVENT = "lovanet:detached-bubble-panel-open";

type DetachedBubblePanelProps = {
  panelId: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * Renders a bubble's controls directly under document.body so dock sizing,
 * transforms and overflow can never affect the panel or its controls.
 */
export function DetachedBubblePanel({
  panelId,
  open,
  onClose,
  children,
  className,
}: DetachedBubblePanelProps) {
  useEffect(() => {
    const closeOtherPanel = (event: Event) => {
      const source = (event as CustomEvent<{ panelId?: string }>).detail?.panelId;
      if (source && source !== panelId) onClose();
    };

    window.addEventListener(OPEN_PANEL_EVENT, closeOtherPanel as EventListener);
    return () => window.removeEventListener(OPEN_PANEL_EVENT, closeOtherPanel as EventListener);
  }, [onClose, panelId]);

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(OPEN_PANEL_EVENT, { detail: { panelId } }));
  }, [open, panelId]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <section
      className={cn("detached-bubble-panel relative", className)}
      data-bubble-panel={panelId}
      role="dialog"
      aria-modal="false"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer le panneau"
        className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition-colors hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </section>,
    document.body,
  );
}

export default DetachedBubblePanel;