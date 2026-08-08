import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { videos } from "@/data/videos";
import { IMPORTED_VIDEOS } from "@/data/importedVideos";

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const ytThumbFallback = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

type WheelVideo = {
  id: string;
  title: string;
  thumb: string;
  source: "youtube" | "tiktok" | "prime";
  url?: string;
};

const SHAPES = [
  "circle(50% at 50% 50%)",
  "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
  "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  "polygon(50% 2%, 95% 18%, 90% 65%, 50% 98%, 10% 65%, 5% 18%)",
  // Square
  "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
  // Triangle
  "polygon(50% 0%, 100% 100%, 0% 100%)",
  // Pentagon
  "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)",
  // Octagon
  "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
  // 6-branch star
  "polygon(50% 0%, 60% 35%, 98% 35%, 68% 57%, 80% 100%, 50% 75%, 20% 100%, 32% 57%, 2% 35%, 40% 35%)",
  // Cross / plus
  "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)",
  // Chevron / arrow
  "polygon(50% 0%, 100% 50%, 75% 100%, 50% 55%, 25% 100%, 0% 50%)",
];

// Strong / RGB palette for the shape fill
const STRONG_COLORS = [
  "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
  "#000000", "#FFFFFF", "#FF7A00", "#7A00FF", "#00FF7A", "#FF0077",
  "#0077FF", "#77FF00", "#FF3D00", "#3D00FF", "#00E5FF", "#E5FF00",
  "#111111", "#0044FF",
];

// Background colors cycling behind the wheel
const BG_COLORS = [
  "#FFFFFF", "#0A0A0F", "#001133", "#330011", "#113300", "#001A1A",
  "#1A0033", "#331A00", "#050510", "#F5F5FA", "#0F1E33", "#2D0F33",
  "#0F332D", "#33200F", "#000814", "#140014", "#080814", "#EAF4FF",
  "#FFEEF6", "#F0FFEE",
];

// 200 unique visual variations (bg × shape × color)
const VARIANTS = Array.from({ length: 200 }, (_, i) => ({
  bg: BG_COLORS[i % BG_COLORS.length],
  shape: SHAPES[Math.floor(i / 4) % SHAPES.length],
  color: STRONG_COLORS[(i * 3 + 1) % STRONG_COLORS.length],
  accent: STRONG_COLORS[(i * 7 + 5) % STRONG_COLORS.length],
}));

const isConstrainedDevice = () => {
  if (typeof window === "undefined") return false;
  const memory = (navigator as any).deviceMemory ?? 8;
  return window.matchMedia("(pointer: coarse), (max-width: 767px), (prefers-reduced-motion: reduce)").matches || memory < 4;
};

type FlowMode = "wheel" | "disc" | "sinuous" | "helix";
const FLOW_MODES: FlowMode[] = ["wheel", "disc", "sinuous", "helix"];

type Xform = { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number; scale: number };

const flowTransform = (
  mode: FlowMode,
  offset: number,
  geom: { radius: number; cardW: number; cardH: number },
  isConstrained: boolean,
  visibleRadius: number,
): Xform => {
  const absO = Math.abs(offset);
  const sign = offset === 0 ? 0 : offset < 0 ? -1 : 1;
  if (mode === "wheel") {
    // Vertical Ferris-wheel arc — cards curve top/bottom, rotateX in and out.
    const maxAng = isConstrained ? 52 : 60;
    const clamped = Math.max(-visibleRadius, Math.min(visibleRadius, offset));
    const ang = (clamped / visibleRadius) * maxAng;
    const rad = (ang * Math.PI) / 180;
    // Larger radius = more vertical spacing between successive cards on the wheel.
    const R = Math.max(geom.radius * 1.7, geom.cardH * 2.3);
    const y = Math.sin(rad) * R;
    const depth = Math.cos(rad);
    const z = (depth - 1) * 80;
    const scale = isConstrained ? 0.9 + depth * 0.1 : 0.85 + depth * 0.15;
    return { x: 0, y, z, rotX: -ang, rotY: 0, rotZ: 0, scale };
  }
  if (mode === "disc") {
    // Kinetic orbital disc — horizontal fan, center pops on Z, sides tilt inward.
    const spacingX = geom.cardW * (isConstrained ? 0.6 : 0.8);
    const x = offset * spacingX;
    const zA = 320, zB = 40, zC = -260;
    let z = absO <= 1 ? zA + (zB - zA) * absO : zB + (zC - zB) * Math.min(1, absO - 1);
    if (isConstrained) z *= 0.35;
    const rotYRaw = absO <= 1 ? -sign * absO * 25 : -sign * (25 + Math.min(1, absO - 1) * 20);
    const rotY = isConstrained ? rotYRaw * 0.5 : rotYRaw;
    const y = isConstrained ? 0 : Math.sin(offset * 0.55) * 14;
    const scale = isConstrained ? Math.max(0.88, 1 - absO * 0.04) : Math.max(0.82, 1 - absO * 0.08);
    return { x, y, z, rotX: isConstrained ? 6 : 12, rotY, rotZ: 0, scale };
  }
  if (mode === "sinuous") {
    // S-curve — horizontal flow with pronounced vertical sinewave.
    const spacingX = geom.cardW * (isConstrained ? 0.62 : 0.85);
    const x = offset * spacingX;
    const y = Math.sin(offset * 1.1) * (isConstrained ? 60 : 110);
    const z = Math.cos(offset * 0.5) * 80 - absO * 30;
    const rotZ = Math.sin(offset * 1.1) * (isConstrained ? 6 : 10);
    const rotY = -sign * Math.min(30, absO * 15);
    const scale = Math.max(isConstrained ? 0.85 : 0.78, 1 - absO * 0.08);
    return { x, y, z, rotX: 6, rotY, rotZ, scale };
  }
  // helix — DNA spiral: cards revolve around a vertical column.
  const R = geom.cardW * (isConstrained ? 0.75 : 1.05);
  const theta = offset * (Math.PI / 3); // 60° per slot
  const x = Math.sin(theta) * R;
  const z = Math.cos(theta) * R - 40;
  const y = offset * (isConstrained ? 26 : 40);
  const rotY = -theta * (180 / Math.PI);
  const scale = 0.78 + Math.max(0, Math.cos(theta)) * 0.22;
  return { x, y, z, rotX: 8, rotY, rotZ: 0, scale };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const placeholderThumb = (id: string, title: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const h1 = h % 360;
  const h2 = (h1 + 72) % 360;
  const safe = (title || "Anime Moment")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u0000-\u001F\u007F<&>]/g, " ")
    .slice(0, 42);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 360'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${h1},85%,55%)'/><stop offset='1' stop-color='hsl(${h2},85%,36%)'/></linearGradient></defs>
    <rect width='640' height='360' fill='url(#g)'/><rect width='640' height='360' fill='rgba(0,0,0,.24)'/>
    <text x='50%' y='50%' fill='white' font-family='system-ui,sans-serif' font-size='28' font-weight='800' text-anchor='middle' dominant-baseline='middle'>${safe}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const HeroCarousel = ({ captureVideo }: { captureVideo?: string } = {}) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const constrainedRef = useRef(false);
  const pausedRef = useRef(false);
  const dragRef = useRef<{ id: number; startX: number; startY: number; lastX: number; lastY: number; axis: "x" | "y" | null; moved: boolean } | null>(null);

  const [isConstrained, setIsConstrained] = useState(false);
  const [paused, setPaused] = useState(false);
  const [shapeIdx, setShapeIdx] = useState(0);
  const [variantIdx, setVariantIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [flowIdx, setFlowIdx] = useState(0);
  const [flowBlend, setFlowBlend] = useState(1); // 1 = fully on flowIdx, 0 = fully on prev
  const prevFlowRef = useRef<FlowMode>(FLOW_MODES[0]);
  const flowSwitchRef = useRef(0); // performance.now() of last mode switch
  const [dragging, setDragging] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [size, setSize] = useState({ w: 520, h: 540 });
  const [spots, setSpots] = useState<boolean[]>([true, true, true]);
  const toggleSpot = (i: number) =>
    setSpots((s) => s.map((v, idx) => (idx === i ? !v : v)));
  const [allVideos, setAllVideos] = useState<WheelVideo[]>(() =>
    videos.map((v) => ({
      id: v.id,
      title: v.title,
      thumb: ytThumb(v.id),
      source: "youtube" as const,
      url: `https://www.youtube.com/watch?v=${v.id}`,
    })),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(pointer: coarse), (max-width: 767px), (prefers-reduced-motion: reduce)");
    const update = () => {
      const next = isConstrainedDevice();
      constrainedRef.current = next;
      setIsConstrained(next);
    };
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const timer = window.setInterval(() => setShapeIdx((i) => (i + 1) % SHAPES.length), isConstrained ? 18000 : 12000);
    return () => window.clearInterval(timer);
  }, [isConstrained]);

  // Rotate through 200 visual variations every 10 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      setVariantIdx((i) => (i + 1) % VARIANTS.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = IMPORTED_VIDEOS.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, 160);
      if (cancelled || !data?.length) return;
      const mapped: WheelVideo[] = data
        .map((r: any) => ({
          id: r.external_id,
          title: r.title ?? "Anime Moment",
          thumb: r.thumbnail_url || (r.source === "youtube" ? ytThumb(r.external_id) : ""),
          source: (r.source as WheelVideo["source"]) ?? "youtube",
          url: r.video_url ?? undefined,
        }))
        .filter((v: any) => Boolean(v.id));
      const unique = Array.from(new Map(mapped.map((v: any) => [v.id, v])).values());
      setAllVideos(unique.slice(0, constrainedRef.current ? 48 : 96));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cache: HTMLImageElement[] = [];
    for (const v of allVideos.slice(0, isConstrained ? 10 : 24)) {
      if (!v.thumb) continue;
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.referrerPolicy = "no-referrer";
      img.src = v.thumb;
      cache.push(img);
    }
    return () => {
      cache.length = 0;
    };
  }, [allVideos, isConstrained]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastPaint = last;
    const MODE_HOLD_MS = 14000; // hold each pattern ~14s
    const MODE_BLEND_MS = 1400; // ease over 1.4s when switching
    flowSwitchRef.current = last;
    const tick = (t: number) => {
      const minFrameMs = constrainedRef.current ? 34 : 17;
      if (t - lastPaint < minFrameMs) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(0.08, (t - last) / 1000);
      last = t;
      lastPaint = t;
      if (!pausedRef.current) {
        // Much slower: ~3× the previous duration so cards drift, not spin.
        setProgress((p) => (p + dt / Math.max(70, allVideos.length * 2.6)) % 1);
      }
      // Advance mode blend towards 1
      const sinceSwitch = t - flowSwitchRef.current;
      const blend = Math.min(1, sinceSwitch / MODE_BLEND_MS);
      setFlowBlend((b) => (Math.abs(b - blend) > 0.005 ? blend : b));
      // Trigger next mode after the hold window
      if (!pausedRef.current && sinceSwitch > MODE_HOLD_MS + MODE_BLEND_MS) {
        flowSwitchRef.current = t;
        setFlowIdx((i) => {
          prevFlowRef.current = FLOW_MODES[i];
          return (i + 1) % FLOW_MODES.length;
        });
        setFlowBlend(0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [allVideos.length]);

  const N = Math.max(1, allVideos.length);
  const visibleRadius = Math.min(isConstrained ? 3 : 5, Math.max(2, Math.floor((N - 1) / 2)));
  const renderedSlots = Math.min(N, visibleRadius * 2 + 3);
  const phase = progress * N;
  const baseSlot = Math.floor(phase);
  const fractional = phase - baseSlot;

  const geometry = useMemo(() => {
    const centerX = size.w * (isConstrained ? 0.5 : 0.62);
    const centerY = size.h * (isConstrained ? 0.48 : 0.42);
    const radius = Math.max(isConstrained ? 138 : 200, Math.min(size.w * (isConstrained ? 0.32 : 0.28), size.h * 0.55));
    const cardW = Math.max(
      isConstrained ? 220 : 340,
      Math.min(radius * 1.7, size.w * (isConstrained ? 0.78 : 0.48), isConstrained ? 380 : 640),
    );
    return { centerX, centerY, radius, cardW, cardH: (cardW * 9) / 16 };
  }, [isConstrained, size.h, size.w]);

  const cards = useMemo(() => {
    const used = new Set<number>();
    return Array.from({ length: renderedSlots }, (_, pos) => pos - Math.floor(renderedSlots / 2))
      .map((rel) => {
        const slotIdx = ((baseSlot + rel) % N + N) % N;
        const v = allVideos[slotIdx];
        return { rel, slotIdx, v, offset: rel - fractional };
      })
      .filter((c) => {
        if (!c.v || used.has(c.slotIdx)) return false;
        used.add(c.slotIdx);
        return true;
      });
  }, [N, allVideos, baseSlot, fractional, renderedSlots]);

  const styleFor = useCallback((offset: number): React.CSSProperties => {
    const absO = Math.abs(offset);
    const currentMode = FLOW_MODES[flowIdx];
    const prevMode = prevFlowRef.current;
    const t = easeInOut(Math.max(0, Math.min(1, flowBlend)));
    const A = flowTransform(prevMode, offset, geometry, isConstrained, visibleRadius);
    const B = flowTransform(currentMode, offset, geometry, isConstrained, visibleRadius);
    const x = lerp(A.x, B.x, t);
    const y = lerp(A.y, B.y, t);
    const z = lerp(A.z, B.z, t);
    const rotX = lerp(A.rotX, B.rotX, t);
    const rotY = lerp(A.rotY, B.rotY, t);
    const rotZ = lerp(A.rotZ, B.rotZ, t);
    const scale = lerp(A.scale, B.scale, t);
    // Opacity + saturate — same rule across modes.
    const edgeFade = Math.max(0, 1 - Math.max(0, absO - (visibleRadius - 0.4)) / 1.4);
    const nearWeight = absO <= 1 ? 1 : absO <= 2 ? 0.72 : 0.4;
    const opacity = absO <= visibleRadius + 0.6 ? Math.max(0.15, nearWeight * edgeFade) : 0;
    const saturate = absO <= 1 ? 1 : Math.max(0.4, 1 - (absO - 1) * 0.35);
    return {
      left: geometry.centerX - geometry.cardW / 2,
      top: geometry.centerY - geometry.cardH / 2,
      width: geometry.cardW,
      aspectRatio: "16 / 9",
      transform:
        `translate3d(${x}px, ${y}px, ${z}px) ` +
        `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) ` +
        `scale(${scale})`,
      transformStyle: "preserve-3d",
      transformOrigin: "center center",
      opacity,
      zIndex: Math.round(200 - absO * 20 + (currentMode === "wheel" ? Math.cos((offset / visibleRadius) * Math.PI * 0.5) * 30 : 0)),
      pointerEvents: opacity > 0.6 ? "auto" : "none",
      filter: isConstrained
        ? (saturate < 1 ? `saturate(${saturate})` : "none")
        : `saturate(${saturate}) drop-shadow(0 18px 30px hsl(240 20% 5% / ${absO <= 1 ? 0.5 : 0.25}))`,
    };
  }, [flowBlend, flowIdx, geometry, isConstrained, visibleRadius]);

  const shiftCards = useCallback((direction: 1 | -1) => {
    setProgress((p) => {
      const next = (p + direction / N) % 1;
      return next < 0 ? next + 1 : next;
    });
  }, [N]);

  const cycleHalo = useCallback(() => setShapeIdx((i) => (i + 1) % SHAPES.length), []);

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("a,button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      axis: null,
      moved: false,
    };
    setPaused(true);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dxTotal = e.clientX - d.startX;
    const dyTotal = e.clientY - d.startY;
    if (d.axis === null) {
      if (Math.abs(dxTotal) < 6 && Math.abs(dyTotal) < 6) return;
      d.axis = Math.abs(dxTotal) > Math.abs(dyTotal) ? "x" : "y";
    }
    const dy = e.clientY - d.lastY;
    const dx = e.clientX - d.lastX;
    d.lastY = e.clientY;
    d.lastX = e.clientX;
    d.moved = true;
    const delta = d.axis === "x" ? dx : dy;
    if (Math.abs(delta) < 1) return;
    setProgress((p) => {
      const next = (p - delta / (N * 48)) % 1;
      return next < 0 ? next + 1 : next;
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
    setPaused(false);
    setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      shiftCards(-1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      shiftCards(1);
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      setPaused((p) => !p);
    }
  };

  return (
    <div
      ref={containerRef}
      data-hologram-block
      className={`rgb-neon relative w-full h-[380px] sm:h-[560px] lg:h-[640px] overflow-hidden touch-pan-y select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 rounded-xl ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ perspective: isConstrained ? 900 : 1400, perspectiveOrigin: "50% 50%" }}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Carrousel de vidéos anime — glissez ou utilisez les flèches pour naviguer"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Transparent dark glass background behind the roulette (same family as menu) */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, hsl(220 30% 8% / 0.45) 0%, hsl(220 25% 12% / 0.55) 50%, hsl(220 30% 8% / 0.45) 100%)",
          backdropFilter: "blur(20px) saturate(1.1)",
          WebkitBackdropFilter: "blur(20px) saturate(1.1)",
          transition: "background 1.2s ease",
          zIndex: 0,
        }}
      />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {allVideos[baseSlot % N]?.title
          ? `Vidéo active : ${allVideos[baseSlot % N].title}`
          : ""}
      </div>

      <button
        type="button"
        aria-label="Changer la forme du halo"
        onClick={cycleHalo}
        className="absolute rounded-full hero-wheel-halo"
        style={{
          width: geometry.radius * 1.9,
          height: geometry.radius * 1.9,
          left: geometry.centerX - geometry.radius * 0.95,
          top: geometry.centerY - geometry.radius * 0.95,
          clipPath: VARIANTS[variantIdx].shape,
          WebkitClipPath: VARIANTS[variantIdx].shape,
          background: `radial-gradient(circle at 32% 28%, ${VARIANTS[variantIdx].accent} 0%, ${VARIANTS[variantIdx].color} 55%, ${VARIANTS[variantIdx].color} 100%)`,
          opacity: isConstrained ? 0.85 : 0.92,
          transition: "clip-path 0.8s ease, background 1.2s ease, opacity 0.6s ease",
          zIndex: 1,
        }}
      />

      <div
        aria-hidden
        className="absolute rounded-full pointer-events-none"
        style={{
          width: geometry.radius * 2,
          height: geometry.radius * 2,
          left: geometry.centerX - geometry.radius,
          top: geometry.centerY - geometry.radius,
          border: "1px solid hsl(var(--neon-cyan) / 0.25)",
          boxShadow: "inset 0 0 14px hsl(0 0% 100% / 0.08)",
        }}
      />

      <div
        className="absolute inset-0 z-[150] flex items-center justify-center px-4 sm:px-8 lg:px-12 pointer-events-none"
        data-testid="anime-moments-capture-banner"
      >
        <div className="relative w-[82%] sm:w-[72%] lg:w-[58%] overflow-hidden rounded-[1.35rem] border border-white/14 bg-black/10 shadow-[0_18px_42px_-18px_rgba(0,0,0,0.65)] backdrop-blur-[2px]">
          <div className="aspect-video">
            <video
              src={captureVideo || "/custom_video_lovanet.mp4"}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
              data-testid="anime-moments-capture-video"
              data-bg-video
            />
          </div>
          <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10" />
        </div>
      </div>

      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-0">
        {cards.map((c) => {
          const isCenter = Math.abs(c.offset) < 0.5;
          const isActive = activeSlot === c.slotIdx;
          return (
            <div
              key={`${c.v.id}-${c.slotIdx}`}
              className={`absolute rounded-xl ${isActive ? "scale-[0.97]" : ""}`}
              style={{
                ...styleFor(c.offset),
                opacity: 0,
                pointerEvents: "none",
              }}
              aria-current={isCenter ? "true" : undefined}
            />
          );
        })}
      </div>

      {/* Interactive spotlights — click to toggle on/off */}
      {[
        { left: "22%", color: "255,40,235" },
        { left: "50%", color: "80,220,255" },
        { left: "78%", color: "255,235,80" },
      ].map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleSpot(i); }}
          aria-label={`Spot ${i + 1} ${spots[i] ? "allumé" : "éteint"}`}
          className="absolute top-2 z-[130]"
          style={{ left: s.left, transform: "translateX(-50%)" }}
        >
          <span
            className="block w-5 h-5 rounded-full border border-white/40"
            style={{
              background: spots[i]
                ? `radial-gradient(circle, #fff 0%, rgb(${s.color}) 40%, rgba(${s.color},0.6) 80%)`
                : "rgba(255,255,255,0.15)",
              boxShadow: spots[i] ? `0 0 26px 4px rgba(${s.color},1), 0 0 60px 12px rgba(${s.color},0.6)` : "none",
            }}
          />
          {spots[i] && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2"
              style={{
                width: 380,
                height: 460,
                background: `radial-gradient(ellipse at top, rgba(255,255,255,0.85) 0%, rgba(${s.color},0.9) 20%, rgba(${s.color},0.45) 55%, transparent 80%)`,
                clipPath: "polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)",
                filter: "blur(1px) saturate(1.4)",
                mixBlendMode: "screen",
              }}
            />
          )}
        </button>
      ))}
    </div>
  );
};