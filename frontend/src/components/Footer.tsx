import { Link } from "react-router-dom";
import { Youtube, ShoppingBag, Newspaper, Compass, Film, PlayCircle, Home, Music2, Clapperboard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import footerLovanetZoneVideo from "@/assets/footer-lovanet-zone-video.mp4";

// Unique destinations — no duplicates between nav and content
const allDestinations = [
  { to: "/", label: "Portail", icon: Home, color: "#a78bfa" },
  { to: "/anime-moments", label: "Anime Moments", icon: Film, color: "#f472b6" },
  { to: "/decouvrir", label: "Découvrir", icon: Compass, color: "#22d3ee" },
  { to: "/chaine-youtube", label: "YouTube", icon: Youtube, color: "#ef4444" },
  { to: "/tiktok", label: "TikTok", icon: Music2, color: "#ec4899" },
  { to: "/prime-video", label: "Prime Vidéo", icon: PlayCircle, color: "#3b82f6" },
  { to: "/lecteurs-video", label: "Lecteurs Vidéo", icon: Clapperboard, color: "#8b5cf6" },
  { to: "/anime-countdown", label: "À venir", icon: Clock, color: "#f59e0b" },
  { to: "/actualites", label: "Actualités", icon: Newspaper, color: "#10b981" },
  { to: "/shop", label: "Boutique", icon: ShoppingBag, color: "#f97316" },
];

const footerPanel =
  "theme-panel-surface rounded-[2rem]";

export const Footer = () => {
  return (
    <footer className="mt-24 px-4 pb-10 sm:px-6 lg:px-8">
      <div className={`mx-auto w-full max-w-6xl overflow-hidden ${footerPanel}`} data-testid="site-footer-shell">
        <div className="grid gap-8 border-b border-[var(--theme-border-soft)] px-5 py-8 sm:px-7 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-10">
          <div className="space-y-5">
            <div className="theme-footer-video-shell relative overflow-hidden rounded-[1.75rem] border border-[var(--theme-border-soft)]" data-testid="footer-lovanet-video-shell">
              <video
                className="h-[250px] w-full object-cover object-center scale-[1.01]"
                src={footerLovanetZoneVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                data-testid="footer-lovanet-video"
                data-bg-video
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[rgba(6,11,24,0.88)] via-[rgba(7,12,24,0.56)] to-[rgba(7,12,24,0.2)]" />
              <div className="pointer-events-none absolute inset-0 opacity-18 mix-blend-screen bg-[linear-gradient(110deg,transparent_16%,rgba(255,255,255,0.16)_28%,transparent_42%,transparent_64%,rgba(255,255,255,0.12)_74%,transparent_88%)] animate-[shimmer_9s_linear_infinite]" />
              <div className="relative z-[1] flex h-full flex-col justify-between p-5 sm:p-6">
                <div className="space-y-4 max-w-[26rem]">
                  <Link to="/" className="inline-flex items-center gap-3" data-testid="footer-home-link">
                    <span className="font-display text-2xl font-black tracking-[0.16em] text-white neon-rgb-text-soft">LOVANET</span>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild className="btn-neon-rainbow rounded-full text-white" data-testid="footer-primary-button">
                    <Link to="/anime-moments">
                      <Film className="h-4 w-4" />
                      Anime Moments
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Premium unified navigation hub — no duplicates */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] uppercase tracking-[0.3em] theme-text-muted px-1">Navigation & Destinations</p>
            <div className="grid grid-cols-2 gap-2">
              {allDestinations.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-2.5 rounded-xl border border-white/8 px-3 py-2.5 text-sm font-medium transition-all hover:border-white/20 hover:scale-[1.02]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    backdropFilter: "blur(10px)",
                  }}
                  data-testid={`footer-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${item.color}25`, color: item.color }}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="theme-text-main text-xs font-semibold leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="theme-text-muted flex flex-col gap-3 px-5 py-4 text-xs sm:px-7 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span className="neon-rgb-text-mini" data-testid="footer-copyright">
            © {new Date().getFullYear()} Lovanet — Anime Moments.
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/legals" className="theme-link-inline transition-colors" data-testid="footer-legals-link">
              Mentions légales
            </Link>
            <span>·</span>
            <a
              href="https://www.youtube.com/@animemomentsanimeofficiel"
              target="_blank"
              rel="noopener noreferrer"
              className="theme-link-inline transition-colors"
              data-testid="footer-youtube-external-link"
            >
              YouTube officiel
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
