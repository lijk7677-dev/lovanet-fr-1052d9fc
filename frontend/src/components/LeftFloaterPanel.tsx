import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Palette, Zap, Lightbulb } from "lucide-react";
import navStyles from "@/data/navStyles";

/**
 * Left floating panel with compact bubbles for LovaBot, Décors 3D, Thème, Personnalisation.
 * Displays as a vertical stack of small compact bubbles that auto-hide.
 */
export default function LeftFloaterPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); };
  }, []);

  const bubbles = [
    { id: 'decor', icon: Sparkles, label: 'Décors', color: 'from-cyan-500 to-blue-600', action: () => console.log('Decor') },
    { id: 'theme', icon: Palette, label: 'Thème', color: 'from-purple-500 to-pink-600', action: () => {
      const fav = localStorage.getItem('lovanet.nav.favorite');
      if (fav) {
        const s = navStyles.find((x) => x.id === fav);
        if (s) window.dispatchEvent(new CustomEvent('navstyle:change', { detail: s.id }));
      }
    }},
    { id: 'custom', icon: Zap, label: 'Custom', color: 'from-amber-500 to-orange-600', action: () => console.log('Custom') },
    { id: 'lovabot', icon: Lightbulb, label: 'LovaBot', color: 'from-green-500 to-emerald-600', action: () => console.log('LovaBot') },
  ];

  const onMouseLeave = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 2400);
  };

  const onMouseEnter = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setOpen(true);
  };

  return (
    <div className="hidden lg:block">
      <div style={{ position: 'fixed', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 9999 }}>
        <div ref={panelRef} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className="relative">
          <AnimatePresence>
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: open ? 0 : -100, opacity: open ? 1 : 0.6 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col gap-3 rounded-r-2xl bg-black/20 backdrop-blur-md px-2 py-3 shadow-xl"
            >
              {/* Compact bubble stack - vertical column of small icons */}
              {bubbles.map((bubble, idx) => {
                const Icon = bubble.icon;
                return (
                  <motion.button
                    key={bubble.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: open ? 1 : 0.7 }}
                    whileHover={{ scale: 1.15 }}
                    transition={{ delay: open ? idx * 0.05 : 0 }}
                    onClick={bubble.action}
                    className={`flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br ${bubble.color} shadow-lg hover:shadow-2xl transition-all relative group`}
                    title={bubble.label}
                  >
                    <Icon className="w-5 h-5 text-white drop-shadow-sm" strokeWidth={1.5} />
                    {/* Tooltip on hover */}
                    {open && (
                      <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-black/80 text-white text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {bubble.label}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
