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
        borderColor: isActive ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.24)",
        background: isActive ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
        boxShadow: isActive
          ? "0 0 22px rgba(255,255,255,0.18), inset 0 0 12px rgba(255,255,255,0.14)"
          : "0 0 14px rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
      aria-label="Ouvrir l'accès rapide"
      title="Accès rapide"
    >
      <div className="absolute inset-0 bg-white/6 mix-blend-overlay" />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="relative"
      >
        <Sparkles
          className="h-6 w-6 text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-opacity group-hover:text-white"
          strokeWidth={2}
        />
      </motion.div>
    </motion.button>
  );
}
