import { useEffect, useState } from "react";
import { NavSuggestionsIndicator } from "@/components/NavSuggestionsIndicator";

export const SUGGESTIONS_TOGGLE_EVENT = "lovanet:toggle-suggestions";
export const SUGGESTIONS_STATE_EVENT = "lovanet:suggestions-state";
export const MINI_MENU_TOGGLE_EVENT = "lovanet:toggle-mini-menu";
export const MINI_MENU_STATE_EVENT = "lovanet:mini-menu-state";

export function SuggestionsBubble() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onState = (event: Event) => {
      const next = (event as CustomEvent<{ open?: boolean }>).detail?.open;
      setOpen(Boolean(next));
    };
    window.addEventListener(MINI_MENU_STATE_EVENT, onState as EventListener);
    return () => window.removeEventListener(MINI_MENU_STATE_EVENT, onState as EventListener);
  }, []);

  return (
    <div className="relative">
      <NavSuggestionsIndicator
        isActive={open}
        onClick={() => window.dispatchEvent(new CustomEvent(MINI_MENU_TOGGLE_EVENT))}
      />
    </div>
  );
}

export default SuggestionsBubble;
