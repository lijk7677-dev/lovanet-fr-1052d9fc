import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function NavSuggestionsIndicator({
  onClick,
  isActive,
}: {
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.15, rotate: 10 }}
      whileTap={{ scale: 0.9, rotate: -10 }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="fixed bottom-[152px] left-3 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 overflow-hidden group sm:left-4 md:bottom-[166px] lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2"
      style={{
        borderColor: "var(--nav-theme-accent, rgba(96,229,255,0.6))",
        background: isActive
          ? "linear-gradient(135deg, var(--nav-theme-accent, rgba(96,229,255,0.3)), var(--nav-theme-accent-2, rgba(186,108,255,0.3)))"
          : "linear-gradient(135deg, rgba(96,229,255,0.15), rgba(186,108,255,0.15))",
        boxShadow: isActive
          ? "0 0 24px var(--nav-theme-accent, rgba(96,229,255,0.5)), inset 0 0 12px rgba(255,255,255,0.3)"
          : "0 0 16px var(--nav-theme-accent, rgba(96,229,255,0.3))",
      }}
      aria-label="Ouvrir suggestions intelligentes"
      title="Suggestions rapides pour vous"
    >
      <div className="absolute inset-0 bg-white/10 animate-pulse mix-blend-overlay" />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <Sparkles
          className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-cyan-300 transition-colors"
          strokeWidth={2}
        />
      </motion.div>

      {/* Pulsing badge */}
      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
    </motion.button>
  );
}
