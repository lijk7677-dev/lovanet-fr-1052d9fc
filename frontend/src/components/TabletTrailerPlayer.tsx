import { useEffect, useMemo, useRef, useState } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";

/**
 * Tablet-shaped video player with an integrated 3D circular carousel of up to
 * 1500 anime trailers from the catalog page + site videos. Auto-plays each
 * trailer to completion and jumps to the next random, non-repeating item.
 * The tablet frame is resizable (drag bottom-right corner).
 */

type Media = {
  id: number | string;
  title: string;
  cover: string;
  ytId: string;
  source: "catalog" | "site";
};

const CATALOG_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      id
      title { romaji english }
      coverImage { large }
      trailer { id site }
    }
  }
}`;

// Lazy-load the YouTube IFrame API once for the whole page — SHARED via
// window so multiple players don't overwrite each other's ready callback.
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

export default function TabletTrailerPlayer() {
  const [items, setItems] = useState<Media[]>([]);
  const [current, setCurrent] = useState<Media | null>(null);
  const playedRef = useRef<Set<string>>(new Set());
  const [phase, setPhase] = useState(0); // 0..1 flow along the 3D spiral
  const [previewItem, setPreviewItem] = useState<Media | null>(null);
  const draggingRef = useRef<{ x: number; a: number; moved?: boolean } | null>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Customizable background behind the 3D carousel + interactive spotlights.
  type BgMode = "color" | "image" | "video";
  const [bgMode, setBgMode] = useState<BgMode>("color");
  const [bgColor, setBgColor] = useState<string>("transparent");
  const [bgMedia, setBgMedia] = useState<string>("");
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [spots, setSpots] = useState<boolean[]>([true, true, true]);
  const toggleSpot = (i: number) =>
    setSpots((s) => s.map((v, idx) => (idx === i ? !v : v)));

  // 50 decorative side ornaments — alternate left/right, cycle a new variation
  // every 29 seconds. Each can be toggled on/off like the spots.
  const DECOR_COUNT = 50;
  const DECOR_VARIANTS = [
    "✦", "✧", "✩", "✪", "✫", "✬", "✭", "✮", "✯", "★",
    "❋", "❊", "❉", "❈", "❇", "✺", "✹", "✸", "✷", "✶",
    "❄", "❅", "❆", "☾", "☽", "♡", "♥", "◈", "◇", "◆",
    "▲", "△", "▼", "▽", "●", "○", "◉", "◎", "☀", "☂",
    "⚡", "☘", "❀", "✿", "❁", "❃", "❄", "✾", "✽", "❂",
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

  const onPickMedia = (file: File) => {
    const url = URL.createObjectURL(file);
    setBgMedia(url);
    setBgMode(file.type.startsWith("video") ? "video" : "image");
  };

  // Load catalog cache + site videos
  useEffect(() => {
    let cancelled = false;

    const merged: Media[] = [];

    // 1) Cached catalog (from AnimeCatalog page) — up to 1500
    try {
      const cached = localStorage.getItem("lovanet.cache.catalog.grid");
      if (cached) {
        const list = JSON.parse(cached) as any[];
        for (const m of list) {
          if (m?.trailer?.id && m?.trailer?.site === "youtube") {
            merged.push({
              id: `c-${m.id}`,
              title: m.title?.english || m.title?.romaji || "Anime",
              cover: m.coverImage?.large || m.coverImage?.extraLarge || "",
              ytId: m.trailer.id,
              source: "catalog",
            });
          }
        }
      }
    } catch {}

    // 2) Site videos from Supabase (YouTube imports)
    (async () => {
      if (!cancelled && merged.length) setItems([...merged].slice(0, 1500));
    })();

    // 3) If catalog cache missing → fetch enough pages to reach 1500 trailers
    (async () => {
      if (merged.length >= 100) {
        setItems([...merged].slice(0, 1500));
        return;
      }
      try {
        const dedup = new Map<string, Media>();
        for (const m of merged) dedup.set(m.ytId, m);
        for (let p = 1; p <= 30 && dedup.size < 1500; p++) {
          const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: CATALOG_QUERY, variables: { page: p, perPage: 50 } }),
          });
          const j = await res.json();
          const list = j?.data?.Page?.media ?? [];
          if (!list.length) break;
          for (const m of list) {
            if (m?.trailer?.id && m?.trailer?.site === "youtube" && !dedup.has(m.trailer.id)) {
              dedup.set(m.trailer.id, {
                id: `c-${m.id}`,
                title: m.title?.english || m.title?.romaji || "Anime",
                cover: m.coverImage?.large || "",
                ytId: m.trailer.id,
                source: "catalog",
              });
            }
          }
          if (cancelled) return;
          setItems(Array.from(dedup.values()).slice(0, 1500));
          await new Promise((r) => setTimeout(r, 150));
        }
      } catch {}
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Pick first item once loaded
  useEffect(() => {
    if (!current && items.length) {
      const first = items[Math.floor(Math.random() * items.length)];
      setCurrent(first);
      playedRef.current.add(first.ytId);
    }
  }, [items, current]);

  // Pick random non-repeating next
  const pickNext = (): Media | null => {
    if (!items.length) return null;
    const remaining = items.filter((m) => !playedRef.current.has(m.ytId));
    if (!remaining.length) {
      playedRef.current.clear();
      const n = items[Math.floor(Math.random() * items.length)];
      playedRef.current.add(n.ytId);
      return n;
    }
    const n = remaining[Math.floor(Math.random() * remaining.length)];
    playedRef.current.add(n.ytId);
    return n;
  };

  // Instantiate YT player once we have a host + first item
  useEffect(() => {
    if (!current) return;
    if (!playerHostRef.current) return;
    if (playerRef.current) {
      try { playerRef.current.loadVideoById(current.ytId); } catch {}
      return;
    }
    let disposed = false;
    loadYTApi().then((YT) => {
      if (disposed || !playerHostRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(playerHostRef.current, {
        host: "https://www.youtube-nocookie.com",
        videoId: current.ytId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => { try { e.target.playVideo(); } catch {} },
          onStateChange: (e: any) => {
            if (e.data === 0) {
              const next = pickNext();
              if (next) setCurrent(next);
            }
          },
          onError: () => {
            const next = pickNext();
            if (next) setCurrent(next);
          },
        },
      });
    });
    return () => { disposed = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.ytId]);

  // Slowly advance the phase — one whole item every ~4 s.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (!draggingRef.current) {
        // Speed in "items per second" — small so scroll is calm.
        setPhase((p) => p + dt * 0.25);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Virtualized 3D spiral — only render a small window of cards so every card
  // has its own screen slot (no stacking, no hidden cards behind others).
  const catalogue = useMemo(() => items.slice(0, 1500), [items]);
  const count = Math.max(catalogue.length, 1);
  const VISIBLE_SLOTS = 11; // odd → nice symmetric center card
  const helixWidth = 1500;
  const helixRadius = 92;
  const slotStep = helixWidth / VISIBLE_SLOTS;

  const onSelect = (m: Media) => {
    setPreviewItem(m);
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 pt-6 pb-4">
      {/* Resizable tablet frame */}
      <div
        className="tablet-frame rgb-neon relative mx-auto"
        style={{
          width: "min(100%, 980px)",
          height: 520,
          minWidth: 320,
          minHeight: 300,
          maxWidth: "100%",
          maxHeight: "90vh",
          resize: "both",
          overflow: "hidden",
          borderRadius: 32,
          padding: 14,
          background:
            "linear-gradient(145deg, hsl(0 0% 100% / 0.06) 0%, hsl(0 0% 100% / 0.03) 50%, hsl(0 0% 100% / 0.06) 100%)",
          backdropFilter: "blur(20px) saturate(1.1)",
          WebkitBackdropFilter: "blur(20px) saturate(1.1)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 40px rgba(217,70,239,0.25)",
        }}
      >
        {/* Speaker slit */}
        <div
          aria-hidden
          className="mx-auto mb-2 rounded-full"
          style={{ width: 60, height: 5, background: "rgba(255,255,255,0.15)" }}
        />
        {/* Screen — full video area */}
        <div
          className="relative w-full rounded-2xl overflow-hidden bg-black/60"
          style={{ height: "calc(100% - 26px)" }}
        >
          <div ref={playerHostRef} className="absolute inset-0 w-full h-full" />
          {!current && (
            <div className="absolute inset-0 grid place-items-center text-white/50 text-sm">
              Chargement des bandes-annonces…
            </div>
          )}
          {current && (
            <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2 text-[11px] text-white/80 pointer-events-none z-10">
              <span className="px-1.5 py-0.5 rounded-full bg-white/[0.10] backdrop-blur border border-white/15 uppercase tracking-widest text-[9px]">
                {current.source === "catalog" ? "Catalogue" : "Site"}
              </span>
              <span className="truncate">{current.title}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3D spiral trailer strip BELOW the tablet — drifts slowly to the right */}
      <div
        data-hologram-block
        className="relative w-full select-none mt-4 rounded-2xl"
        style={{
          height: 360,
          perspective: "1400px",
          overflow: "hidden",
          background: bgMode === "color" ? bgColor : "transparent",
        }}
        onPointerDown={(e) => {
          draggingRef.current = { x: e.clientX, a: phase, moved: false };
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          const dx = e.clientX - draggingRef.current.x;
          if (Math.abs(dx) > 4) {
            draggingRef.current.moved = true;
            // Dragging right pushes phase back so cards move with the finger.
            setPhase(draggingRef.current.a - dx / slotStep);
          }
        }}
        onPointerUp={() => { draggingRef.current = null; }}
      >
        {/* Custom media background (image / video) */}
        {bgMode !== "color" && bgMedia && (
          bgMode === "video" ? (
            <video
              src={bgMedia}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              data-bg-video
            />
          ) : (
            <img
              src={bgMedia}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )
        )}

        {/* Decorative side ornaments — 25 left / 25 right, drifting vertically,
            varying every 29s. Click any to toggle it on/off. */}
        {Array.from({ length: DECOR_COUNT }).map((_, i) => {
          const side = i % 2 === 0 ? "left" : "right";
          const rowIndex = Math.floor(i / 2); // 0..24
          const variantIdx =
            (i + decorTick * 7 + rowIndex * 3) % DECOR_VARIANTS.length;
          const glyph = DECOR_VARIANTS[variantIdx];
          const on = decorOn[i];
          // Vertical position spread + gentle drift with phase
          const basePct = 4 + rowIndex * 3.7; // 4%..~92%
          const drift = Math.sin((phase + i) * 0.9) * 8;
          const top = `${basePct}%`;
          const size = 14 + ((i * 37) % 14); // 14..27px
          const hue = (i * 137 + decorTick * 40) % 360;
          const color = on ? `hsl(${hue} 90% 70%)` : "rgba(255,255,255,0.18)";
          return (
            <button
              key={`decor-${i}`}
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleDecor(i); }}
              aria-label={`Décor ${i + 1}`}
              className="absolute z-20 leading-none transition-all duration-500"
              style={{
                [side]: `${2 + ((i * 13) % 26)}px` as any,
                top,
                transform: `translateY(${drift}px)`,
                fontSize: size,
                color: on ? decorColor : "rgba(255,255,255,0.18)",
                textShadow: on
                  ? `0 0 10px ${decorColor}, 0 0 20px ${color}`
                  : "none",
                opacity: on ? 1 : 0.35,
              }}
            >
              {glyph}
            </button>
          );
        })}

        {/* Interactive spotlights — click to toggle on/off */}
        {[
          { left: "18%", color: "255,80,220" },
          { left: "50%", color: "120,200,255" },
          { left: "82%", color: "255,220,120" },
        ].map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSpot(i); }}
            aria-label={`Spot ${i + 1} ${spots[i] ? "allumé" : "éteint"}`}
            className="absolute top-0 z-20"
            style={{ left: s.left, transform: "translateX(-50%)" }}
          >
            {/* Lamp head */}
            <span
              className="block w-5 h-5 rounded-full border border-white/40"
              style={{
                background: spots[i]
                  ? `radial-gradient(circle, rgb(${s.color}) 0%, rgba(${s.color},0.4) 70%)`
                  : "rgba(255,255,255,0.15)",
                boxShadow: spots[i]
                  ? `0 0 18px rgba(${s.color},0.9)`
                  : "none",
              }}
            />
            {/* Beam */}
            {spots[i] && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2"
                style={{
                  width: 220,
                  height: 240,
                  background: `radial-gradient(ellipse at top, rgba(${s.color},0.55) 0%, rgba(${s.color},0.15) 40%, transparent 70%)`,
                  clipPath: "polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)",
                  filter: "blur(2px)",
                }}
              />
            )}
          </button>
        ))}

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative"
            style={{
              width: 1,
              height: 1,
              transformStyle: "preserve-3d",
              transform: "rotateX(6deg)",
            }}
          >
            {(() => {
              const base = Math.floor(phase);
              const frac = phase - base; // 0..1
              const slots: JSX.Element[] = [];
              // Render 2 extra slots outside on each side for smooth entry/exit.
              for (let k = -2; k < VISIBLE_SLOTS + 2; k++) {
                const idx = ((base + k) % count + count) % count;
                const m = catalogue[idx];
                if (!m) continue;
                // localPos: continuous position 0..1 across the strip.
                const localPos = (k - frac) / (VISIBLE_SLOTS - 1);
                const x = (localPos - 0.5) * helixWidth;
                // Two full spiral turns across the visible strip.
                const theta = localPos * Math.PI * 4;
                const y = Math.sin(theta) * helixRadius * 0.5;
                const z = Math.cos(theta) * helixRadius;
                const depth = (z + helixRadius) / (helixRadius * 2); // 0..1
                const scale = 0.85 + depth * 0.35;
                const opacity =
                  localPos < 0 || localPos > 1
                    ? Math.max(0, 1 - Math.min(Math.abs(localPos), Math.abs(localPos - 1)) * 3)
                    : 1;
                const isActive = current?.ytId === m.ytId;
                slots.push(
                  <button
                    key={`slot-${k}-${m.ytId}`}
                    onClick={(e) => {
                    if (draggingRef.current?.moved) return;
                    e.stopPropagation();
                    onSelect(m);
                  }}
                    title={m.title}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{
                      width: 108,
                      height: 154,
                      transform: `translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`,
                      opacity,
                      zIndex: Math.round(depth * 1000),
                    }}
                  >
                    <div
                      className="w-full h-full rounded-md overflow-hidden border transition-transform group-hover:scale-125"
                      style={{
                        borderColor: isActive ? "#f0abfc" : "rgba(255,255,255,0.18)",
                        boxShadow: isActive
                          ? "0 0 22px rgba(240,171,252,0.95), 0 8px 20px rgba(0,0,0,0.7)"
                          : "0 8px 18px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06) inset",
                      }}
                    >
                      {m.cover ? (
                        <img
                          src={m.cover}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5" />
                      )}
                    </div>
                  </button>,
                );
              }
              return slots;
            })()}
          </div>
        </div>

        {/* Background customization panel */}
        <div className="absolute bottom-2 right-2 z-30 flex flex-col items-end gap-2">
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
                <span className="uppercase tracking-widest text-[10px] text-white/70">Image / Vidéo</span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => e.target.files?.[0] && onPickMedia(e.target.files[0])}
                  className="text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-white/10 file:text-white"
                />
              </label>
              {bgMode !== "color" && (
                <button
                  type="button"
                  onClick={() => { setBgMedia(""); setBgMode("color"); }}
                  className="text-[10px] underline text-white/70 self-start"
                >
                  Retirer le média
                </button>
              )}
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
      </div>

      {/* Fullscreen preview modal for clicked thumbnail */}
      {previewItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Aperçu : ${previewItem.title}`}
          className="fixed inset-0 z-[2147483600] bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative w-full max-w-6xl max-h-[90vh] aspect-video rounded-xl sm:rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black/80"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={buildYouTubeEmbedUrl(previewItem.ytId, { autoplay: true, muted: false, controls: true, playsInline: true })}
              title={previewItem.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  playedRef.current.add(previewItem.ytId);
                  setCurrent(previewItem);
                  setPreviewItem(null);
                }}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] uppercase tracking-widest bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur"
              >
                <span className="hidden sm:inline">Lire sur la tablette</span>
                <span className="sm:hidden">Lire</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                aria-label="Fermer"
                className="w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur text-lg leading-none"
              >
                ×
              </button>
            </div>
            <div className="absolute bottom-2 sm:bottom-3 left-3 right-3 sm:left-4 sm:right-4 text-white text-xs sm:text-sm truncate pointer-events-none">
              {previewItem.title}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
