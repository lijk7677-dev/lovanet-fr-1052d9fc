import { useLocation, useNavigate } from "react-router-dom";
import { ChevronUp, Home, Sparkles, Film, Play, ShoppingBag, Compass } from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type SuggestionType = "trending" | "recommended" | "context" | "quick-link";

interface QuickSuggestion {
  to: string;
  label: string;
  emoji?: string;
  icon?: typeof Home;
  type: SuggestionType;
  contextual?: boolean;
}

const contextualSuggestions: Record<string, QuickSuggestion[]> = {
  default: [
    { to: "/anime-catalog", label: "Catalogue", emoji: "📺", type: "quick-link" },
    { to: "/actualites", label: "News", emoji: "📰", type: "trending" },
    { to: "/decouvrir", label: "Univers", emoji: "🌍", type: "recommended" },
    { to: "/leaderboard", label: "Classement", emoji: "🏆", type: "trending" },
  ],
  "/anime-moments": [
    { to: "/anime-catalog", label: "Plus d'anime", emoji: "📺", type: "context" },
    { to: "/actualites", label: "À venir", emoji: "⏰", type: "context" },
    { to: "/shop", label: "Merchandise", emoji: "🛍️", type: "recommended" },
  ],
  "/anime-catalog": [
    { to: "/prime-video", label: "Prime Vidéo", emoji: "🎬", type: "context" },
    { to: "/anime-moments", label: "Moments", emoji: "✨", type: "recommended" },
    { to: "/leaderboard", label: "Tendances", emoji: "📊", type: "trending" },
  ],
  "/shop": [
    { to: "/anime-catalog", label: "Inspirations", emoji: "🎨", type: "context" },
    { to: "/actualites", label: "Nouveautés", emoji: "🆕", type: "trending" },
    { to: "/", label: "Portail", emoji: "🏠", type: "quick-link" },
  ],
  "/actualites": [
    { to: "/anime-catalog", label: "Catalogue", emoji: "📺", type: "recommended" },
    { to: "/decouvrir", label: "Univers", emoji: "🎪", type: "context" },
    { to: "/leaderboard", label: "Trending", emoji: "🔥", type: "trending" },
  ],
};

export function MobileNavFloater({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const suggestions = useMemo(() => {
    const path = Object.keys(contextualSuggestions).find((p) => pathname === p || pathname.startsWith(`${p}/`));
    return contextualSuggestions[path || "default"];
  }, [pathname]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={onToggle}
          style={{ top: "-100vh" }}
        />

        {/* Floater Panel */}
        <div className="relative mx-2 mb-2 overflow-hidden rounded-t-3xl border border-white/15 bg-gradient-to-b from-white/8 to-black/40 shadow-2xl backdrop-blur-xl">
          {/* Header with minimize button */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50">Suggestions</p>
              <p className="text-xs font-semibold text-white/90">Pour vous</p>
            </div>
            <button
              onClick={onToggle}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition-all"
              aria-label="Réduire le menu"
            >
              <ChevronUp className="h-4 w-4 text-white/80" />
            </button>
          </div>

          {/* Suggestions grid */}
          <div className="grid grid-cols-2 gap-2 p-3 xs:grid-cols-3 sm:grid-cols-4">
            {suggestions.map((suggestion, idx) => (
              <motion.button
                key={suggestion.to}
                onClick={() => {
                  navigate(suggestion.to);
                  onToggle();
                }}
                onHoverStart={() => setHoveredIndex(idx)}
                onHoverEnd={() => setHoveredIndex(null)}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "group relative flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition-all",
                  hoveredIndex === idx
                    ? "border-blue-400/60 bg-blue-500/15 shadow-[0_0_16px_rgba(96,165,250,0.3)]"
                    : "border-white/12 bg-white/6 hover:bg-white/10",
                )}
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-blue-400/0 to-blue-600/0 group-hover:from-blue-400/20 group-hover:to-blue-600/10 blur-md transition-all" />

                {/* Content */}
                <span className="relative text-xl">{suggestion.emoji || "✨"}</span>
                <span className="relative text-[11px] font-semibold leading-tight text-white/85">
                  {suggestion.label}
                </span>

                {/* Type indicator */}
                <span
                  className={cn(
                    "relative text-[8px] font-mono uppercase tracking-wider",
                    suggestion.type === "trending" && "text-orange-400/80",
                    suggestion.type === "recommended" && "text-cyan-400/80",
                    suggestion.type === "context" && "text-purple-400/80",
                    suggestion.type === "quick-link" && "text-gray-500",
                  )}
                >
                  {suggestion.type === "trending" && "🔥"}
                  {suggestion.type === "recommended" && "💡"}
                  {suggestion.type === "context" && "🎯"}
                  {suggestion.type === "quick-link" && "⭐"}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Quick stats / footer */}
          <div className="border-t border-white/10 bg-white/5 px-4 py-2 text-center">
            <p className="text-[10px] text-white/40">
              ✨ Suggestions intelligentes basées sur votre parcours
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
