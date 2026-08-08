import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TrendingTopic {
  id: string;
  label: string;
  emoji: string;
  to: string;
  trend?: "hot" | "new" | "featured";
  color?: string;
}

const trendingTopics: TrendingTopic[] = [
  { id: "seasonal", label: "Saison 2025", emoji: "🌸", to: "/anime-catalog?season=2025", trend: "hot" },
  { id: "upcoming", label: "À venir", emoji: "⏰", to: "/anime-countdown", trend: "featured" },
  { id: "trending", label: "Tendances", emoji: "🔥", to: "/leaderboard", trend: "hot" },
  { id: "exclusive", label: "Exclu Premium", emoji: "👑", to: "/prime-video", trend: "new" },
  { id: "manga", label: "Nouvelles Séries", emoji: "📖", to: "/chaine-youtube/manga", trend: "new" },
];

const contextualChips: Record<string, TrendingTopic[]> = {
  default: [
    { id: "catalog", label: "Catalogue", emoji: "📺", to: "/anime-catalog", color: "from-purple-500/20 to-pink-600/20" },
    { id: "trending", label: "Top 10", emoji: "🏆", to: "/leaderboard", color: "from-amber-500/20 to-orange-600/20" },
    { id: "breaking", label: "News", emoji: "📰", to: "/actualites", color: "from-blue-500/20 to-cyan-600/20" },
  ],
  "/anime-moments": [
    { id: "related", label: "Catalogue", emoji: "📺", to: "/anime-catalog" },
    { id: "upcoming", label: "À venir", emoji: "⏰", to: "/anime-countdown" },
    { id: "trending", label: "Tendances", emoji: "🔥", to: "/leaderboard" },
  ],
  "/anime-catalog": [
    { id: "watch", label: "Regarder", emoji: "🎬", to: "/prime-video" },
    { id: "news", label: "News", emoji: "📰", to: "/actualites" },
    { id: "shop", label: "Shop", emoji: "🛍️", to: "/shop" },
  ],
  "/shop": [
    { id: "inspire", label: "Inspiration", emoji: "🎨", to: "/anime-catalog" },
    { id: "new", label: "Nouveautés", emoji: "🆕", to: "/actualites" },
    { id: "trending", label: "Populaire", emoji: "📊", to: "/leaderboard" },
  ],
};

export function NavSuggestionsBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [rotationIndex, setRotationIndex] = useState(0);

  // Get contextual chips for current page
  const contextChips = useMemo(() => {
    const path = Object.keys(contextualChips).find((p) => pathname === p || pathname.startsWith(`${p}/`));
    return contextualChips[path || "default"];
  }, [pathname]);

  // Auto-rotate trending topics
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % trendingTopics.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-1 items-center justify-start gap-1.5 overflow-x-auto overflow-y-hidden px-1.5 scrollbar-hide lg:hidden">
      <AnimatePresence mode="wait">
        {contextChips.map((chip, idx) => (
          <motion.button
            key={chip.id}
            onClick={() => navigate(chip.to)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "group relative inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap",
              "border border-white/15 bg-gradient-to-r",
              chip.color || "from-white/8 to-white/5",
              "hover:border-white/30 hover:from-white/15 hover:to-white/12",
              "transition-all shadow-sm hover:shadow-md",
            )}
          >
            <span className="text-sm">{chip.emoji}</span>
            <span className="text-white/90">{chip.label}</span>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Trending indicator with rotating items */}
      <div className="ml-auto flex items-center gap-1">
        <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider px-1">
          Trending
        </div>
        <AnimatePresence mode="wait">
          <motion.button
            key={`trending-${rotationIndex}`}
            onClick={() => navigate(trendingTopics[rotationIndex].to)}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap",
              "border border-orange-400/40 bg-gradient-to-r from-orange-500/15 to-red-600/10",
              "hover:border-orange-400/60 hover:from-orange-500/25 hover:to-red-600/15",
              "transition-all shadow-sm hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]",
            )}
          >
            <span className="animate-pulse">{trendingTopics[rotationIndex].emoji}</span>
            <span className="text-orange-300/90">{trendingTopics[rotationIndex].label}</span>
            <span className="text-[9px] text-orange-300/60 ml-0.5 font-mono">●</span>
          </motion.button>
        </AnimatePresence>
      </div>
    </div>
  );
}
