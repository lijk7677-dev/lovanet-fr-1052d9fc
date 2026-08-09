import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import navStyles from "@/data/navStyles";

const contextualSuggestions = [
  { to: "/anime-catalog", label: "Catalogue", emoji: "📺" },
  { to: "/chaine-youtube", label: "YouTube", emoji: "🎬" },
  { to: "/anime-moments", label: "Moments", emoji: "✨" },
  { to: "/shop", label: "Boutique", emoji: "🛍️" },
];

export default function LeftFloaterPanel() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); };
  }, []);

  const suggestions = useMemo(() => contextualSuggestions, [pathname]);

  const onMouseLeave = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 2600);
  };

  const onMouseEnter = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setOpen(true);
  };

  return (
    <div className="hidden lg:block">
      <div className="fixed left-0 top-1/2 z-60 transform -translate-y-1/2">
        <div ref={panelRef} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="relative">
          <AnimatePresence>
            <motion.div
              initial={{ x: -140, opacity: 0 }}
              animate={{ x: open ? 0 : -140, opacity: open ? 1 : 0.7 }}
              exit={{ x: -140, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="flex items-center gap-2 rounded-r-3xl bg-black/30 backdrop-blur-md px-3 py-2 shadow-2xl"
              style={{ width: open ? 420 : 56 }}
            >
              {/* Toggle icon: thin 3D animated */}
              <button onClick={() => setOpen((s) => !s)} aria-expanded={open} className="flex items-center justify-center h-10 w-10 rounded-full bg-white/6 border border-white/10 mr-2" title="Afficher les bulles">
                <svg className="w-5 h-5 animate-rotate-3d" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeOpacity="0.9" />
                </svg>
              </button>

              <div className={cn("flex gap-3 items-center overflow-x-auto no-scrollbar py-1", open ? "" : "hidden")}>
                {suggestions.map((s) => (
                  <button key={s.to} onClick={() => navigate(s.to)} className="flex-shrink-0 h-12 w-32 rounded-xl p-2 bg-white/6 text-white/90 flex items-center gap-2" style={{ backdropFilter: 'blur(6px)' }}>
                    <span className="text-lg">{s.emoji}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </button>
                ))}

                {/* quick presets shortcut: show favorite */}
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const fav = localStorage.getItem('lovanet.nav.favorite');
                    if (fav) {
                      const s = navStyles.find((x) => x.id === fav);
                      if (s) window.dispatchEvent(new CustomEvent('navstyle:change', { detail: s.id }));
                    }
                  }} className="h-10 w-10 rounded-lg bg-white/6 flex items-center justify-center border border-white/10">
                    <Star className="w-4 h-4 text-white/90" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <style>{`@keyframes rotate3d { from { transform: rotateY(0deg) rotateX(0deg); } to { transform: rotateY(360deg) rotateX(8deg); } } .animate-rotate-3d { animation: rotate3d 6s linear infinite; transform-origin: 50% 50%; } .no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
