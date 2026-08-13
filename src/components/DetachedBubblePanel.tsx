import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
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
      className={cn("detached-bubble-panel", className)}
      data-bubble-panel={panelId}
      role="dialog"
      aria-modal="false"
    >
      {children}
    </section>,
    document.body,
  );
}

export default DetachedBubblePanel;