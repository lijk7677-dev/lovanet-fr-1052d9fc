import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

type Item = { id: string; title: string; to: string; color?: string; subtitle?: string };

const DEFAULT_ITEMS: Item[] = [
  { id: 'home', title: 'Portail', to: '/anime-moments', color: 'from-cyan-400 to-indigo-500', subtitle: 'Accueil' },
  { id: 'catalog', title: 'Catalogue', to: '/anime-catalog', color: 'from-amber-400 to-red-500', subtitle: 'Trailers & fiches' },
  { id: 'youtube', title: 'YouTube', to: '/chaine-youtube', color: 'from-green-400 to-emerald-600', subtitle: 'Chaîne officielle' },
  { id: 'shop', title: 'Boutique', to: '/shop', color: 'from-pink-400 to-purple-600', subtitle: 'Produits' },
  { id: 'tiktok', title: 'TikTok', to: '/tiktok', color: 'from-sky-400 to-blue-600', subtitle: 'Clips viraux' },
  { id: 'leader', title: 'Classement', to: '/leaderboard', color: 'from-fuchsia-400 to-rose-600', subtitle: 'Top' },
];

export default function QuickNavCarousel({ items = DEFAULT_ITEMS, onClose }: { items?: Item[]; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [, setFrame] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      dragging.current = true;
      startX.current = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
      scrollLeft.current = el.scrollLeft;
      el.classList.add('cursor-grabbing');
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const x = 'touches' in e ? e.touches[0].pageX : (e as MouseEvent).pageX;
      const dx = x - startX.current;
      el.scrollLeft = scrollLeft.current - dx;
      setFrame((f) => f + 1);
    };
    const onUp = () => {
      dragging.current = false;
      el.classList.remove('cursor-grabbing');
    };
    el.addEventListener('mousedown', onDown as any);
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp as any);
    el.addEventListener('touchstart', onDown as any, { passive: true } as any);
    window.addEventListener('touchmove', onMove as any, { passive: true } as any);
    window.addEventListener('touchend', onUp as any);
    return () => {
      el.removeEventListener('mousedown', onDown as any);
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp as any);
      el.removeEventListener('touchstart', onDown as any);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp as any);
    };
  }, []);

  return (
    <div className="w-full py-6">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Navigation rapide</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => onClose && onClose()} aria-label="Fermer la navigation rapide" className="rounded-full bg-white/6 p-2 text-sm text-white/90 hover:bg-white/10">
                Fermer
              </button>
            </div>
          </div>
        <div
          ref={ref}
          className="relative flex gap-4 overflow-x-auto no-scrollbar py-4 px-2 will-change-transform"
          style={{ WebkitOverflowScrolling: 'touch' }}
          aria-label="Quick navigation carousel"
        >
          {items.map((it, idx) => (
            <Link
              key={it.id}
              to={it.to}
              className={`flex-shrink-0 w-56 sm:w-64 h-40 rounded-2xl p-4 text-white transform-gpu transition-transform duration-300 hover:scale-105 focus:scale-105 ring-1 ring-white/10 relative overflow-hidden`} 
              aria-label={it.title}
              onClick={() => onClose && onClose()}
            >
              <div className="absolute inset-0 rounded-2xl" style={{ background: `var(--nav-card-overlay, linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06)))`, backdropFilter: 'blur(6px)' }} />
              <div className="relative h-full w-full rounded-xl p-3 flex flex-col justify-between">
                <div className="text-sm font-semibold opacity-90 z-10">{it.subtitle}</div>
                <div className="text-xl font-extrabold mt-2 z-10">{it.title}</div>
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: it.color ? `linear-gradient(45deg, ${it.color})` : 'linear-gradient(45deg,#6EE7B7,#60A5FA)' }} />
                <div className="absolute left-3 bottom-3 z-10 text-xs text-white/90">Aller →</div>
                {/* animated icon placeholder */}
                <div className="absolute right-3 bottom-3 z-20 w-10 h-10 rounded-md bg-white/6 flex items-center justify-center">
                  <svg className="w-6 h-6 animate-spin-slow text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="8" strokeOpacity="0.2" />
                    <path d="M12 4v4" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
