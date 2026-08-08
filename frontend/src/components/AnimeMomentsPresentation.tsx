import { Link } from "react-router-dom";
import {
  Play,
  ShoppingBag,
  Search,
  Bell,
  Share2,
  Flame,
  Youtube,
  Music2,
  Sparkles,
  Calendar,
  Copy,
  MessageCircle,
  Twitter,
  Facebook,
  ArrowRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MiniCatalogOrb from "@/components/MiniCatalogOrb";
import blingBling from "@/assets/bling-bling.jpg.asset.json";
import { videos } from "@/data/videos";

const tags = [
  "Lovanet",
  "Manga animé",
  "YouTube",
  "TikTok",
  "Shop",
  "3D",
  "Live",
  "Selection",
];

const reactions = [
  { emoji: "🔥", label: "Hot", color: "bg-orange-500" },
  { emoji: "😂", label: "Fun", color: "bg-yellow-400" },
  { emoji: "😍", label: "Love", color: "bg-pink-500" },
  { emoji: "⚡", label: "Hype", color: "bg-fuchsia-500" },
  { emoji: "👀", label: "Watch", color: "bg-cyan-400" },
];

const services = [
  {
    to: "/anime-catalog",
    icon: Search,
    title: "Explorer le catalogue",
    desc: "1500+ animés à découvrir",
    accent: "from-fuchsia-500 to-pink-500",
    cta: "Ouvrir",
  },
  {
    to: "/anime-countdown",
    icon: Calendar,
    title: "Countdown sorties",
    desc: "Prochains épisodes & saisons",
    accent: "from-cyan-400 to-sky-500",
    cta: "Voir le planning",
  },
  {
    to: "/chaine-youtube",
    icon: Flame,
    title: "Tendances YouTube",
    desc: "Moments forts du moment",
    accent: "from-red-500 to-rose-500",
    cta: "Regarder",
  },
  {
    to: "/shop",
    icon: ShoppingBag,
    title: "Shop créateur",
    desc: "Drops manga exclusifs",
    accent: "from-violet-500 to-fuchsia-600",
    cta: "Boutique",
  },
];

// Lazy YT IFrame API loader — SHARED across every component on the page.
// Stored on window so multiple components mounting on the same page don't
// overwrite each other's onYouTubeIframeAPIReady callback (which would leave
// one of the players waiting forever with no iframe rendered).
const loadYTApi = (): Promise<any> => {
  if (typeof window === "undefined") return Promise.reject();
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (w.__ytApiPromise) return w.__ytApiPromise;
  w.__ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      try { prev?.(); } catch {}
      resolve(w.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return w.__ytApiPromise;
};

export const AnimeMomentsPresentation = () => {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true);

  // Rotating banner playlist: AnimeMomentsOfficiel site videos + catalogue trailers.
  const PLAYED_KEY = "lovanet.banner.played.v1";
  const readPlayed = (): Set<string> => {
    try {
      const raw = localStorage.getItem(PLAYED_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  };
  const initialPool = (() => {
    const ids = new Set(videos.map((v) => v.id));
    try {
      const cached = localStorage.getItem("lovanet.cache.catalog.grid");
      if (cached) {
        const list = JSON.parse(cached) as any[];
        for (const m of list) {
          if (m?.trailer?.id && m?.trailer?.site === "youtube") ids.add(m.trailer.id);
        }
      }
    } catch {}
    return Array.from(ids);
  })();
  const initialPlayed = readPlayed();
  const pickInitial = () => {
    const remaining = initialPool.filter((id) => !initialPlayed.has(id));
    const source = remaining.length ? remaining : initialPool;
    return source[Math.floor(Math.random() * source.length)] ?? videos[0]?.id ?? "bGFUthZjGd4";
  };
  const firstId = pickInitial();
  const [pool, setPool] = useState<string[]>(initialPool);
  const [bannerId, setBannerId] = useState<string>(firstId);
  const playedRef = useRef<Set<string>>(new Set([...initialPlayed, firstId]));
  const persistPlayed = () => {
    try { localStorage.setItem(PLAYED_KEY, JSON.stringify([...playedRef.current])); } catch {}
  };
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);

  // Spotlights + customizable background on the banner
  const [spots, setSpots] = useState<boolean[]>([true, true, true]);
  const toggleSpot = (i: number) =>
    setSpots((s) => s.map((v, idx) => (idx === i ? !v : v)));

  // 50 interactive edge decorations — variation cycles every 29 s.
  const DECOR_COUNT = 50;
  const DECOR_VARIANTS = [
    "✦","✧","✩","✪","✫","✬","✭","✮","✯","★",
    "❋","❊","❉","❈","❇","✺","✹","✸","✷","✶",
    "❄","❅","❆","☾","☽","♡","♥","◈","◇","◆",
    "▲","△","▼","▽","●","○","◉","◎","☀","☂",
    "⚡","☘","❀","✿","❁","❃","✾","✽","❂","☄",
  ];
  const [decorOn, setDecorOn] = useState<boolean[]>(
    () => Array.from({ length: DECOR_COUNT }, () => true),
  );
  const [decorTick, setDecorTick] = useState(0);
  const [decorColor, setDecorColor] = useState<string>("#f0abfc");
  useEffect(() => {
    const id = setInterval(() => setDecorTick((t) => t + 1), 29000);
    return () => clearInterval(id);
  }, []);
  const toggleDecor = (i: number) =>
    setDecorOn((s) => s.map((v, idx) => (idx === i ? !v : v)));

  type BgMode = "video" | "color" | "media";
  const [bgMode, setBgMode] = useState<BgMode>("video");
  const [bgColor, setBgColor] = useState("#0b0b16");
  const [bgMedia, setBgMedia] = useState("");
  const [mediaKind, setMediaKind] = useState<"image" | "video">("image");
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [dimOverlay, setDimOverlay] = useState(true);
  const onPickMedia = (file: File) => {
    const url = URL.createObjectURL(file);
    setBgMedia(url);
    setMediaKind(file.type.startsWith("video") ? "video" : "image");
    setBgMode("media");
  };

  // Load catalogue trailers from cache and merge with site videos.
  useEffect(() => {
    try {
      const cached = localStorage.getItem("lovanet.cache.catalog.grid");
      if (!cached) return;
      const list = JSON.parse(cached) as any[];
      const ids = new Set(pool);
      for (const m of list) {
        if (m?.trailer?.id && m?.trailer?.site === "youtube") ids.add(m.trailer.id);
      }
      setPool(Array.from(ids));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickNext = () => {
    if (!pool.length) return bannerId;
    const remaining = pool.filter((id) => !playedRef.current.has(id));
    const source = remaining.length ? remaining : (playedRef.current.clear(), pool);
    const n = source[Math.floor(Math.random() * source.length)];
    playedRef.current.add(n);
    persistPlayed();
    return n;
  };

  // Instantiate the YT player once — auto-advance on end.
  useEffect(() => {
    if (!playerHostRef.current || playerRef.current) return;
    let disposed = false;
    loadYTApi().then((YT) => {
      if (disposed || !playerHostRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(playerHostRef.current, {
        host: "https://www.youtube-nocookie.com",
        videoId: bannerId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => { try { muted ? e.target.mute() : e.target.unMute(); e.target.playVideo(); } catch {} },
          onStateChange: (e: any) => {
            // Keep bannerId in sync with the actually playing video (so the
            // "Voir l'épisode" link always points to what's on screen).
            try {
              const vid = e.target?.getVideoData?.()?.video_id;
              if (vid && vid !== bannerId) setBannerId(vid);
            } catch {}
            // If the player gets paused by the browser, resume it.
            if (e.data === 2) { try { e.target.playVideo(); } catch {} }
            if (e.data === 0) {
              const nxt = pickNext();
              setBannerId(nxt);
              try { playerRef.current?.loadVideoById(nxt); } catch {}
            }
          },
          onError: () => {
            const nxt = pickNext();
            setBannerId(nxt);
            try { playerRef.current?.loadVideoById(nxt); } catch {}
          },
        },
      });
    });
    return () => { disposed = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mute changes to the live player.
  useEffect(() => {
    try {
      if (!playerRef.current) return;
      muted ? playerRef.current.mute() : playerRef.current.unMute();
    } catch {}
  }, [muted]);

  const activeVideo = videos.find((v) => v.id === bannerId) ?? videos[0];

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : "https://lovanet.fr";
  const shareText = "Lovanet — Anime Moments, catalogue & shop";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <section className="container mx-auto px-4 lg:px-8 py-10 lg:py-14">
      <div className="relative w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_80px_-20px_hsl(var(--neon-magenta)/0.35)] bg-white/[0.04] backdrop-blur-2xl">
        {/* PRO VIDEO BANNER */}
        <div className="relative w-full aspect-[21/9] sm:aspect-[21/8] overflow-hidden border-b border-white/10">
          {/* Custom background layer (color / user image / user video) */}
          {bgMode === "color" && (
            <div className="absolute inset-0 z-0" style={{ background: bgColor }} />
          )}
          {bgMode === "media" && bgMedia && (
            mediaKind === "video" ? (
              <video src={bgMedia} autoPlay loop muted playsInline className="absolute inset-0 z-0 w-full h-full object-cover" data-bg-video />
            ) : (
              <img src={bgMedia} alt="" className="absolute inset-0 z-0 w-full h-full object-cover" />
            )
          )}

          {dimOverlay && (
            <>
              <div className="absolute inset-0 z-0 bg-black/20 pointer-events-none" />
              <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-950/60 via-transparent to-zinc-950/60 pointer-events-none" />
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-zinc-950/60 via-transparent to-zinc-950/60 pointer-events-none" />
              <img
                src={blingBling.url}
                alt=""
                aria-hidden
                className="absolute inset-0 z-0 w-full h-full object-cover opacity-25 pointer-events-none mix-blend-screen"
              />
            </>
          )}

          {/* YT player host — controlled via IFrame API */}
          <div className="absolute inset-0 z-20 w-full h-full scale-[1.35] pointer-events-none">
            <div ref={playerHostRef} className="w-full h-full" />
          </div>

          {/* Interactive spotlights */}
          {[
            { left: "20%", color: "255,80,220" },
            { left: "50%", color: "120,200,255" },
            { left: "80%", color: "255,220,120" },
          ].map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleSpot(i)}
              aria-label={`Spot ${i + 1} ${spots[i] ? "allumé" : "éteint"}`}
              className="absolute top-0 z-30"
              style={{ left: s.left, transform: "translateX(-50%)" }}
            >
              <span
                className="block w-5 h-5 rounded-full border border-white/40"
                style={{
                  background: spots[i]
                    ? `radial-gradient(circle, rgb(${s.color}) 0%, rgba(${s.color},0.4) 70%)`
                    : "rgba(255,255,255,0.15)",
                  boxShadow: spots[i] ? `0 0 18px rgba(${s.color},0.9)` : "none",
                }}
              />
              {spots[i] && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2"
                  style={{
                    width: 280,
                    height: 320,
                    background: `radial-gradient(ellipse at top, rgba(${s.color},0.55) 0%, rgba(${s.color},0.15) 40%, transparent 70%)`,
                    clipPath: "polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)",
                    filter: "blur(2px)",
                  }}
                />
              )}
            </button>
          ))}

          {/* Decorative side ornaments — 25 left / 25 right, varying every 29s */}
          {Array.from({ length: DECOR_COUNT }).map((_, i) => {
            const side = i % 2 === 0 ? "left" : "right";
            const rowIndex = Math.floor(i / 2); // 0..24
            const variantIdx =
              (i + decorTick * 7 + rowIndex * 3) % DECOR_VARIANTS.length;
            const glyph = DECOR_VARIANTS[variantIdx];
            const on = decorOn[i];
            const basePct = 3 + rowIndex * 3.8;
            const size = 14 + ((i * 37) % 14);
            return (
              <button
                key={`decor-${i}`}
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleDecor(i); }}
                aria-label={`Décor ${i + 1}`}
                className="absolute z-30 leading-none transition-all duration-500"
                style={{
                  [side]: `${2 + ((i * 13) % 26)}px` as any,
                  top: `${basePct}%`,
                  fontSize: size,
                  color: on ? decorColor : "rgba(255,255,255,0.18)",
                  textShadow: on
                    ? `0 0 10px ${decorColor}, 0 0 22px ${decorColor}`
                    : "none",
                  opacity: on ? 1 : 0.35,
                }}
              >
                {glyph}
              </button>
            );
          })}

          {/* Background customization panel */}
          <div className="absolute bottom-16 right-4 sm:right-6 z-30 flex flex-col items-end gap-2">
            {showBgPanel && (
              <div className="rounded-xl bg-white/[0.08] backdrop-blur border border-white/15 p-3 flex flex-col gap-2 text-white text-xs">
                <div className="flex items-center gap-2">
                  <label className="uppercase tracking-widest text-[10px] text-white/70">Couleur</label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => { setBgColor(e.target.value); setBgMode("color"); }}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent"
                  />
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <span className="uppercase tracking-widest text-[10px] text-white/70">Image / Vidéo</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => e.target.files?.[0] && onPickMedia(e.target.files[0])}
                    className="text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-white/10 file:text-white"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <label className="uppercase tracking-widest text-[10px] text-white/70">Décors</label>
                  <input
                    type="color"
                    value={decorColor}
                    onChange={(e) => setDecorColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setDecorOn((s) => s.map(() => true))}
                    className="text-[10px] underline text-white/70"
                  >Tout allumer</button>
                  <button
                    type="button"
                    onClick={() => setDecorOn((s) => s.map(() => false))}
                    className="text-[10px] underline text-white/70"
                  >Éteindre</button>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dimOverlay}
                    onChange={(e) => setDimOverlay(e.target.checked)}
                  />
                  <span className="uppercase tracking-widest text-[10px] text-white/70">Voile sombre</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setBgMedia(""); setBgMode("video"); }}
                  className="text-[10px] underline text-white/70 self-start"
                >
                  Réactiver la vidéo
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowBgPanel((v) => !v)}
              className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur"
            >
              {showBgPanel ? "Fermer" : "Fond"}
            </button>
          </div>

          {/* Banner overlays */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.08] backdrop-blur border border-white/10 text-white/90 text-[10px] font-bold tracking-widest uppercase">
              Officiel Lovanet
            </span>
          </div>

          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur border border-white/15 flex items-center justify-center text-white transition-colors"
            aria-label={muted ? "Activer le son" : "Couper le son"}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

        </div>

        {/* Content */}
        <div className="relative z-10 grid grid-cols-12 gap-6 p-6 sm:p-10 lg:p-14">
          {/* Left: headline + CTAs + tags */}
          <div className="col-span-12 lg:col-span-7 flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-400/30 text-fuchsia-200 text-[10px] font-bold tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500" />
              </span>
              AnimemomentsAnimeofficiel
            </div>

            <h1
              className="neon-rgb-text-mini font-display text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem] font-black leading-[0.9] tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
              style={{ letterSpacing: "-0.02em" }}
            >
              ANIME<br />MOMENTS
            </h1>

            {/* Primary CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
              <Link
                to="/lecteurs-video"
                className="group relative px-7 py-4 rounded-full text-zinc-900 font-black text-base inline-flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 shadow-[0_15px_40px_-10px_rgba(255,255,255,0.5)] hover:shadow-[0_20px_50px_-8px_rgba(255,255,255,0.7)] hover:scale-[1.04] active:scale-[0.97] transition-all duration-300"
                aria-label="Lancer la lecture"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Lancer la lecture</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/shop"
                className="group px-6 py-4 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 bg-white text-zinc-900 hover:bg-fuchsia-100 shadow-lg hover:scale-[1.03] transition-all"
                aria-label="Ouvrir la boutique officielle"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Boutique officielle</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/anime-catalog"
                className="group px-6 py-4 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/15 text-white border border-white/25 backdrop-blur-md transition-all hover:scale-[1.03]"
                aria-label="Explorer le catalogue d'animés"
              >
                <Sparkles className="w-4 h-4" />
                <span>Catalogue 1500+</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Tags */}
            <div className="mt-8 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] backdrop-blur-xl border border-white/15 text-white/80 text-xs hover:text-white hover:bg-white/[0.12] hover:border-fuchsia-300/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: quick services */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-5 justify-center">
            <div className="grid grid-cols-2 gap-3">
              {services.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="group relative p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_30px_-15px_rgba(0,0,0,0.5)] hover:border-white/30 hover:bg-white/[0.08] transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(236,72,153,0.45),inset_0_1px_0_rgba(255,255,255,0.18)]"
                  aria-label={s.title}
                >
                  <div
                    className={`relative w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-white bg-white/[0.08] backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] overflow-hidden group-hover:scale-110 group-hover:rotate-3 transition-transform`}
                  >
                    <span className={`absolute inset-0 opacity-60 mix-blend-screen bg-gradient-to-br ${s.accent}`} aria-hidden />
                    <span className="relative">
                    <s.icon className="w-5 h-5" />
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white leading-tight">
                    {s.title}
                  </div>
                  <div className="text-[11px] text-white/60 mt-0.5">{s.desc}</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-fuchsia-300 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all">
                    {s.cta} <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer bar: reactions + share + social */}
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-6 sm:px-10 lg:px-14 py-5 border-t border-white/5 bg-gradient-to-t from-white/[0.06] to-transparent">
          <div className="flex flex-wrap items-center gap-2">
            {reactions.map((r) => (
              <button
                key={r.label}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${r.color}`} />
                <span>
                  {r.emoji} {r.label}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">
              Partager
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyLink}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                aria-label="Copier le lien"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                aria-label="Partager sur X"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                aria-label="Partager sur Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                aria-label="Partager sur WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://www.youtube.com/channel/UC0T9pcWA9_lpdB6-ZucZYmw"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <Music2 className="w-4 h-4" />
              </a>
            </div>

            <button
              className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-400/30 text-fuchsia-100 text-xs font-bold transition-colors"
            >
              <Bell className="w-3.5 h-3.5" /> M'alerter des sorties
            </button>
          </div>
        </div>

        {copied && (
          <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-black/80 border border-white/10 text-xs text-white shadow-lg">
            Lien copié ✓
          </div>
        )}
      </div>
    </section>
  );
};

export default AnimeMomentsPresentation;