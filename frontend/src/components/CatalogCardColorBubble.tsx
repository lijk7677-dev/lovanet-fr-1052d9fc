import { useEffect, useRef, useState } from "react";
import { Move, Sparkles, X } from "lucide-react";

/**
 * Floating bubble anchored to the middle of the RIGHT edge.
 * Offers 50 color/gradient/animated/transparent options that apply
 * ONLY to the anime-catalog cards via CSS variables:
 *   --catalog-card-bg / --catalog-card-fg / --catalog-card-border
 *   --catalog-card-anim (animation shorthand when animated)
 */

type Skin = {
  key: string;
  label: string;
  bg: string;
  fg: string;
  border: string;
  swatch: string;
  animated?: boolean;
};

// 50 options: transparent, solids, pastels, neons, RGB animated gradients.
const SKINS: Skin[] = [
  { key: "off",           label: "Défaut",       bg: "transparent",                                                                                     fg: "#ffffff", border: "rgba(255,255,255,0.12)", swatch: "linear-gradient(135deg,#222,#444)" },
  { key: "glass",         label: "Verre",        bg: "hsla(0,0%,100%,0.08)",                                                                            fg: "#ffffff", border: "rgba(255,255,255,0.25)", swatch: "linear-gradient(135deg,rgba(255,255,255,0.35),rgba(255,255,255,0.05))" },
  { key: "glass-dark",    label: "Verre noir",   bg: "hsla(0,0%,0%,0.35)",                                                                              fg: "#ffffff", border: "rgba(255,255,255,0.18)", swatch: "linear-gradient(135deg,#111,#333)" },
  { key: "trans-cyan",    label: "Trans. cyan",  bg: "hsla(186,100%,50%,0.18)",                                                                         fg: "#eafcff", border: "rgba(0,255,255,0.55)",   swatch: "linear-gradient(135deg,rgba(0,255,255,0.5),rgba(0,255,255,0.05))" },
  { key: "trans-pink",    label: "Trans. rose",  bg: "hsla(320,100%,55%,0.18)",                                                                         fg: "#ffeaf7", border: "rgba(255,0,212,0.55)",   swatch: "linear-gradient(135deg,rgba(255,0,212,0.5),rgba(255,0,212,0.05))" },
  { key: "trans-purple",  label: "Trans. violet",bg: "hsla(270,100%,60%,0.22)",                                                                         fg: "#f2eaff", border: "rgba(191,0,255,0.55)",   swatch: "linear-gradient(135deg,rgba(191,0,255,0.5),rgba(191,0,255,0.05))" },
  { key: "trans-green",   label: "Trans. vert",  bg: "hsla(120,90%,55%,0.18)",                                                                          fg: "#eaffea", border: "rgba(57,255,20,0.55)",   swatch: "linear-gradient(135deg,rgba(57,255,20,0.5),rgba(57,255,20,0.05))" },
  { key: "trans-yellow",  label: "Trans. jaune", bg: "hsla(52,100%,55%,0.22)",                                                                          fg: "#fffceb", border: "rgba(255,220,0,0.55)",   swatch: "linear-gradient(135deg,rgba(255,220,0,0.5),rgba(255,220,0,0.05))" },
  { key: "trans-blue",    label: "Trans. bleu",  bg: "hsla(220,100%,60%,0.22)",                                                                         fg: "#eaf3ff", border: "rgba(59,130,246,0.55)",  swatch: "linear-gradient(135deg,rgba(59,130,246,0.5),rgba(59,130,246,0.05))" },
  { key: "trans-orange",  label: "Trans. orange",bg: "hsla(22,100%,55%,0.22)",                                                                          fg: "#fff2e6", border: "rgba(255,103,0,0.55)",   swatch: "linear-gradient(135deg,rgba(255,103,0,0.5),rgba(255,103,0,0.05))" },
  { key: "white",         label: "Blanc",        bg: "#ffffff",                                                                                          fg: "#0a0a0a", border: "rgba(0,0,0,0.12)",       swatch: "#ffffff" },
  { key: "ivory",         label: "Ivoire",       bg: "#fffbe6",                                                                                          fg: "#1a1a00", border: "rgba(0,0,0,0.15)",       swatch: "#fffbe6" },
  { key: "cream",         label: "Crème",        bg: "#f5e6c8",                                                                                          fg: "#2a1a05", border: "rgba(0,0,0,0.15)",       swatch: "#f5e6c8" },
  { key: "black",         label: "Noir",         bg: "#0a0a0a",                                                                                          fg: "#fafafa", border: "rgba(255,255,255,0.15)", swatch: "#0a0a0a" },
  { key: "graphite",      label: "Graphite",     bg: "#1c1c22",                                                                                          fg: "#f1f1f5", border: "rgba(255,255,255,0.12)", swatch: "#1c1c22" },
  { key: "midnight",      label: "Minuit",       bg: "#0f0c29",                                                                                          fg: "#eaeaff", border: "rgba(126,110,255,0.35)", swatch: "linear-gradient(135deg,#0f0c29,#302b63)" },
  { key: "rose",          label: "Rose",         bg: "#ffe0ec",                                                                                          fg: "#3a0a20", border: "rgba(236,72,153,0.35)",  swatch: "#ffe0ec" },
  { key: "sky",           label: "Ciel",         bg: "#e0f2ff",                                                                                          fg: "#06243d", border: "rgba(59,130,246,0.35)",  swatch: "#e0f2ff" },
  { key: "mint",          label: "Menthe",       bg: "#e0ffe9",                                                                                          fg: "#063a1a", border: "rgba(34,197,94,0.35)",   swatch: "#e0ffe9" },
  { key: "lavender",      label: "Lavande",      bg: "#ece0ff",                                                                                          fg: "#1a0a3a", border: "rgba(139,92,246,0.35)",  swatch: "#ece0ff" },
  { key: "peach",         label: "Pêche",        bg: "#ffd9c0",                                                                                          fg: "#3a1a05", border: "rgba(255,150,80,0.4)",   swatch: "#ffd9c0" },
  { key: "coral",         label: "Corail",       bg: "#ff7f6b",                                                                                          fg: "#2a0a05", border: "rgba(255,120,90,0.6)",   swatch: "#ff7f6b" },
  { key: "teal",          label: "Sarcelle",     bg: "#008080",                                                                                          fg: "#eafffb", border: "rgba(0,200,200,0.6)",    swatch: "#008080" },
  { key: "navy",          label: "Marine",       bg: "#1e3a8a",                                                                                          fg: "#eaf3ff", border: "rgba(96,148,255,0.6)",   swatch: "#1e3a8a" },
  { key: "indigo",        label: "Indigo",       bg: "#4338ca",                                                                                          fg: "#f0eeff", border: "rgba(160,150,255,0.6)",  swatch: "#4338ca" },
  { key: "burgundy",      label: "Bordeaux",     bg: "#800020",                                                                                          fg: "#ffe6ea", border: "rgba(220,50,90,0.6)",    swatch: "#800020" },
  { key: "fluo-pink",     label: "Fluo rose",    bg: "#ff00d4",                                                                                          fg: "#ffffff", border: "rgba(255,0,212,0.7)",    swatch: "#ff00d4" },
  { key: "fluo-cyan",     label: "Fluo cyan",    bg: "#00ffff",                                                                                          fg: "#001a1a", border: "rgba(0,255,255,0.7)",    swatch: "#00ffff" },
  { key: "fluo-green",    label: "Fluo vert",    bg: "#39ff14",                                                                                          fg: "#001a00", border: "rgba(57,255,20,0.7)",    swatch: "#39ff14" },
  { key: "fluo-yellow",   label: "Fluo jaune",   bg: "#ffff33",                                                                                          fg: "#1a1a00", border: "rgba(255,255,51,0.7)",   swatch: "#ffff33" },
  { key: "fluo-orange",   label: "Fluo orange",  bg: "#ff6700",                                                                                          fg: "#1a0a00", border: "rgba(255,103,0,0.7)",    swatch: "#ff6700" },
  { key: "fluo-purple",   label: "Fluo violet",  bg: "#bf00ff",                                                                                          fg: "#ffffff", border: "rgba(191,0,255,0.7)",    swatch: "#bf00ff" },
  { key: "fluo-red",      label: "Fluo rouge",   bg: "#ff073a",                                                                                          fg: "#ffffff", border: "rgba(255,7,58,0.7)",     swatch: "#ff073a" },
  { key: "fluo-lime",     label: "Fluo lime",    bg: "#ccff00",                                                                                          fg: "#1a1a00", border: "rgba(204,255,0,0.7)",    swatch: "#ccff00" },
  { key: "fluo-magenta",  label: "Fluo magenta", bg: "#ff00ff",                                                                                          fg: "#ffffff", border: "rgba(255,0,255,0.7)",    swatch: "#ff00ff" },
  { key: "fluo-mint",     label: "Fluo menthe",  bg: "#00ff9f",                                                                                          fg: "#001a10", border: "rgba(0,255,159,0.7)",    swatch: "#00ff9f" },
  { key: "fluo-sky",      label: "Fluo ciel",    bg: "#7df9ff",                                                                                          fg: "#001a1a", border: "rgba(125,249,255,0.7)",  swatch: "#7df9ff" },
  { key: "fluo-gold",     label: "Fluo or",      bg: "#ffd700",                                                                                          fg: "#1a1400", border: "rgba(255,215,0,0.7)",    swatch: "#ffd700" },
  // Animated gradients (use --catalog-card-anim)
  { key: "anim-rgb",      label: "RGB",          bg: "linear-gradient(135deg,#ff0080,#7928ca,#0070f3,#00d4ff,#39ff14,#ffd700,#ff0080)",                  fg: "#ffffff", border: "rgba(255,255,255,0.5)", swatch: "conic-gradient(from 0deg,#ff0080,#7928ca,#0070f3,#00d4ff,#39ff14,#ffd700,#ff0080)", animated: true },
  { key: "anim-aurora",   label: "Aurore",       bg: "linear-gradient(135deg,#00c9ff,#92fe9d,#fc466b,#3f5efb,#00c9ff)",                                  fg: "#ffffff", border: "rgba(255,255,255,0.5)", swatch: "linear-gradient(135deg,#00c9ff,#92fe9d,#fc466b,#3f5efb)", animated: true },
  { key: "anim-sunset",   label: "Coucher",      bg: "linear-gradient(135deg,#ff6e7f,#bfe9ff,#ff9966,#ff5e62,#ff6e7f)",                                  fg: "#1a0000", border: "rgba(255,110,127,0.6)", swatch: "linear-gradient(135deg,#ff6e7f,#ff9966,#ff5e62)", animated: true },
  { key: "anim-ocean",    label: "Océan",        bg: "linear-gradient(135deg,#2e3192,#1bffff,#0f2027,#2c5364,#2e3192)",                                  fg: "#eaffff", border: "rgba(27,255,255,0.5)",  swatch: "linear-gradient(135deg,#2e3192,#1bffff,#2c5364)", animated: true },
  { key: "anim-candy",    label: "Bonbon",       bg: "linear-gradient(135deg,#ff9a9e,#fad0c4,#fbc2eb,#a18cd1,#ff9a9e)",                                  fg: "#1a0011", border: "rgba(251,194,235,0.6)", swatch: "linear-gradient(135deg,#ff9a9e,#fbc2eb,#a18cd1)", animated: true },
  { key: "anim-fire",     label: "Feu",          bg: "linear-gradient(135deg,#f12711,#f5af19,#ff512f,#dd2476,#f12711)",                                  fg: "#ffffff", border: "rgba(241,39,17,0.6)",   swatch: "linear-gradient(135deg,#f12711,#f5af19,#dd2476)", animated: true },
  { key: "anim-ice",      label: "Glace",        bg: "linear-gradient(135deg,#83a4d4,#b6fbff,#a1c4fd,#c2e9fb,#83a4d4)",                                  fg: "#001a2a", border: "rgba(182,251,255,0.7)", swatch: "linear-gradient(135deg,#83a4d4,#b6fbff,#a1c4fd)", animated: true },
  { key: "anim-galaxy",   label: "Galaxie",      bg: "linear-gradient(135deg,#0f0c29,#302b63,#24243e,#7f00ff,#0f0c29)",                                  fg: "#eaeaff", border: "rgba(127,0,255,0.6)",   swatch: "linear-gradient(135deg,#0f0c29,#302b63,#7f00ff)", animated: true },
  { key: "anim-neon",     label: "Néon",         bg: "linear-gradient(135deg,#fc00ff,#00dbde,#ff00aa,#00ff88,#fc00ff)",                                  fg: "#ffffff", border: "rgba(252,0,255,0.6)",   swatch: "linear-gradient(135deg,#fc00ff,#00dbde,#00ff88)", animated: true },
  { key: "anim-vapor",    label: "Vaporwave",    bg: "linear-gradient(135deg,#ff71ce,#01cdfe,#05ffa1,#b967ff,#ff71ce)",                                  fg: "#0a0a0a", border: "rgba(1,205,254,0.6)",   swatch: "linear-gradient(135deg,#ff71ce,#01cdfe,#b967ff)", animated: true },
  { key: "anim-rainbow",  label: "Arc-en-ciel",  bg: "linear-gradient(90deg,#ff0000,#ff7f00,#ffff00,#00ff00,#0000ff,#4b0082,#9400d3,#ff0000)",           fg: "#ffffff", border: "rgba(255,255,255,0.5)", swatch: "linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#0000ff,#9400d3)", animated: true },
  { key: "anim-holo",     label: "Holo",         bg: "linear-gradient(135deg,#ff71ce,#01cdfe,#05ffa1,#b967ff,#ff71ce)",                                  fg: "#0a0a0a", border: "rgba(255,113,206,0.6)", swatch: "linear-gradient(135deg,#ff71ce,#05ffa1,#b967ff)", animated: true },
  { key: "anim-gold",     label: "Or animé",     bg: "linear-gradient(135deg,#fde68a,#f59e0b,#fde68a,#b4771a,#fde68a)",                                  fg: "#2a1a00", border: "rgba(245,158,11,0.7)",  swatch: "linear-gradient(135deg,#fde68a,#f59e0b)",         animated: true },
];

const STORAGE = "lovanet:catalog-card-color";
// v3 key forces refresh from old overlapping positions
const POSITION_STORAGE = "lovanet:catalog-color-pos-v3";

const PANEL_W = 340;
const VIEWPORT_MARGIN = 16;
const SIDE_SAFE_OFFSET = 104;

const safeDefault = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const panelW = Math.min(Math.round(w * 0.9), PANEL_W);
  const rightInset = w >= 1024 ? SIDE_SAFE_OFFSET : SIDE_SAFE_OFFSET + 12;
  return {
    x: Math.max(VIEWPORT_MARGIN, w - panelW - rightInset),
    y: w < 600 ? 20 : Math.max(VIEWPORT_MARGIN, Math.round(h * 0.08)),
  };
};

const clampPos = (x: number, y: number) => ({
  x: Math.min(Math.max(x, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerWidth - Math.min(Math.round(window.innerWidth * 0.9), PANEL_W) - VIEWPORT_MARGIN)),
  y: Math.min(Math.max(y, VIEWPORT_MARGIN), window.innerHeight - (window.innerWidth >= 1024 ? 160 : 220)),
});

type PanelRect = { x: number; y: number; w: number; h: number };
const REGISTRY_KEY = "__lovanetOpenBubblePanels";
const REGISTRY_EVENT = "lovanet:bubble-registry-change";
const PANEL_ID = "catalog-color";
const PANEL_PRIORITY: Record<string, number> = {
  theme: 3,
  "catalog-color": 2,
  "card-skin": 1,
};

const getPriority = (id: string) => PANEL_PRIORITY[id] ?? 0;

const getRegistry = (): Record<string, PanelRect> => {
  const host = window as unknown as { [REGISTRY_KEY]?: Record<string, PanelRect> };
  if (!host[REGISTRY_KEY]) host[REGISTRY_KEY] = {};
  return host[REGISTRY_KEY] as Record<string, PanelRect>;
};

const notifyRegistryChange = (source: string) => {
  window.dispatchEvent(new CustomEvent(REGISTRY_EVENT, { detail: { source } }));
};

const overlaps = (a: PanelRect, b: PanelRect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const getSettingsPanelRect = (): PanelRect => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const panelW = Math.min(Math.round(w * 0.92), 320);
  const panelH = Math.min(Math.round(h * 0.78), 620);
  const panelBottom = w >= 1024 ? 170 : 220;
  const x = Math.round((w - panelW) / 2);
  const y = h - panelBottom - panelH;
  const sidePad = w >= 1024 ? 36 : 48;
  const topPad = w >= 1024 ? 44 : 64;
  const bottomPad = w >= 1024 ? 26 : 38;
  return {
    x: Math.max(0, x - sidePad),
    y: Math.max(0, y - topPad),
    w: Math.min(w, panelW + sidePad * 2),
    h: Math.min(h, panelH + topPad + bottomPad),
  };
};

const getBottomBarRect = (): PanelRect => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const reserved = w >= 1024 ? 120 : 170;
  return { x: 0, y: h - reserved, w, h: reserved };
};

const resolveNonOverlapping = (id: string, x: number, y: number, w: number, h: number) => {
  const gap = 12;
  const blockers: PanelRect[] = [
    getSettingsPanelRect(),
    getBottomBarRect(),
    ...Object.entries(getRegistry())
      .filter(([key]) => key !== id && getPriority(key) >= getPriority(id))
      .sort(([left], [right]) => getPriority(right) - getPriority(left))
      .map(([, rect]) => rect),
  ];
  let rect = { x, y, w, h };

  rect.x = Math.min(Math.max(rect.x, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.w - VIEWPORT_MARGIN));
  rect.y = Math.min(Math.max(rect.y, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.h - VIEWPORT_MARGIN));

  for (let i = 0; i < 8; i += 1) {
    const hit = blockers.find((b) => overlaps(rect, b));
    if (!hit) break;

    let nextX = hit.x + hit.w + gap;
    if (nextX > window.innerWidth - rect.w - VIEWPORT_MARGIN) {
      nextX = hit.x - rect.w - gap;
    }
    if (nextX < VIEWPORT_MARGIN) {
      nextX = rect.x;
    }

    let nextY = rect.y;
    if (nextX === rect.x) {
      nextY = hit.y + hit.h + gap;
      if (nextY > window.innerHeight - rect.h - VIEWPORT_MARGIN) {
        nextY = Math.max(VIEWPORT_MARGIN, hit.y - rect.h - gap);
      }
    }

    rect = {
      ...rect,
      x: Math.min(Math.max(nextX, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.w - VIEWPORT_MARGIN)),
      y: Math.min(Math.max(nextY, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.h - VIEWPORT_MARGIN)),
    };
  }

  return { x: rect.x, y: rect.y };
};

const apply = (s: Skin) => {
  const r = document.documentElement.style;
  if (s.key === "off") {
    r.removeProperty("--catalog-card-bg");
    r.removeProperty("--catalog-card-fg");
    r.removeProperty("--catalog-card-border");
    r.removeProperty("--catalog-card-anim");
    r.removeProperty("--catalog-card-size");
    return;
  }
  r.setProperty("--catalog-card-bg", s.bg);
  r.setProperty("--catalog-card-fg", s.fg);
  r.setProperty("--catalog-card-border", s.border);
  r.setProperty("--catalog-card-anim", s.animated ? "lovanet-bg-shift 14s ease infinite" : "none");
  r.setProperty("--catalog-card-size", s.animated ? "400% 400%" : "auto");
};

export const CatalogCardColorBubble = () => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("off");
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const estimatePanelSize = () => ({
    w: Math.min(Math.round(window.innerWidth * 0.9), PANEL_W),
    h: Math.min(Math.round(window.innerHeight * 0.8), 560),
  });

  const placePanel = (base: { x: number; y: number }) => {
    const size = panelRef.current
      ? { w: panelRef.current.offsetWidth, h: panelRef.current.offsetHeight }
      : estimatePanelSize();
    const clamped = clampPos(base.x, base.y);
    return resolveNonOverlapping(PANEL_ID, clamped.x, clamped.y, size.w, size.h);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE) ?? "off";
    const s = SKINS.find((x) => x.key === saved) ?? SKINS[0];
    apply(s);
    setActive(s.key);

    const savedPos = localStorage.getItem(POSITION_STORAGE);
    if (savedPos) {
      try {
        const p = JSON.parse(savedPos) as { x?: number; y?: number };
        if (typeof p.x === "number" && typeof p.y === "number") {
          setPanelPos(placePanel({ x: p.x, y: p.y }));
          return;
        }
      } catch { /* ignore */ }
    }
    setPanelPos(placePanel(safeDefault()));
  }, []);

  useEffect(() => {
    if (!open || !panelPos) return;
    const size = panelRef.current
      ? { w: panelRef.current.offsetWidth, h: panelRef.current.offsetHeight }
      : estimatePanelSize();
    getRegistry()[PANEL_ID] = { x: panelPos.x, y: panelPos.y, w: size.w, h: size.h };
    notifyRegistryChange(PANEL_ID);
    return () => {
      delete getRegistry()[PANEL_ID];
      notifyRegistryChange(PANEL_ID);
    };
  }, [open, panelPos]);

  useEffect(() => {
    if (!open || !panelPos) return;
    const handleRegistryChange = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source;
      if (source === PANEL_ID || !panelRef.current) return;
      const resolved = resolveNonOverlapping(
        PANEL_ID,
        panelPos.x,
        panelPos.y,
        panelRef.current.offsetWidth,
        panelRef.current.offsetHeight,
      );
      if (resolved.x === panelPos.x && resolved.y === panelPos.y) return;
      setPanelPos(resolved);
      localStorage.setItem(POSITION_STORAGE, JSON.stringify(resolved));
    };

    window.addEventListener(REGISTRY_EVENT, handleRegistryChange as EventListener);
    return () => {
      window.removeEventListener(REGISTRY_EVENT, handleRegistryChange as EventListener);
    };
  }, [open, panelPos]);

  const pick = (s: Skin) => {
    apply(s);
    localStorage.setItem(STORAGE, s.key);
    setActive(s.key);
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    isDraggingRef.current = true;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !dragOffsetRef.current || !panelRef.current) return;
    const m = 8;
    const nx = Math.min(Math.max(e.clientX - dragOffsetRef.current.x, m), window.innerWidth - panelRef.current.offsetWidth - m);
    const ny = Math.min(Math.max(e.clientY - dragOffsetRef.current.y, m), window.innerHeight - panelRef.current.offsetHeight - m);
    const resolved = resolveNonOverlapping(PANEL_ID, nx, ny, panelRef.current.offsetWidth, panelRef.current.offsetHeight);
    setPanelPos(resolved);
    localStorage.setItem(POSITION_STORAGE, JSON.stringify(resolved));
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId))
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    isDraggingRef.current = false;
    dragOffsetRef.current = null;
  };

  return (
    <>
      {open && panelPos && (
        <div
          ref={panelRef}
          className="fixed z-[10050] touch-none rounded-2xl border border-white/45 bg-[rgba(255,255,255,0.18)] p-3 text-white shadow-[0_20px_56px_rgba(0,0,0,0.3)] backdrop-blur-2xl w-[min(90vw,340px)] max-h-[80vh] overflow-y-auto"
          style={{ left: `${panelPos.x}px`, top: `${panelPos.y}px` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="mb-2 flex cursor-grab select-none items-center justify-between gap-2">
            <span className="inline-flex items-center text-white/70" aria-hidden="true">
              <Move className="h-3.5 w-3.5" />
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le panneau couleur des cartes"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/90 transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-7">
            {SKINS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => pick(s)}
                title={s.label}
                aria-label={s.label}
                className={`relative h-10 w-10 rounded-full border border-white/35 transition-transform hover:scale-110 sm:h-9 sm:w-9 md:h-8 md:w-8 ${
                  active === s.key ? "ring-2 ring-white ring-offset-2 ring-offset-transparent" : ""
                }`}
                style={{
                  background: s.swatch,
                  backgroundSize: s.animated ? "300% 300%" : undefined,
                  animation: s.animated ? "lovanet-bg-shift 8s ease infinite" : undefined,
                }}
              >
                {s.key === "off" && <span className="absolute inset-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Orb button stays fixed on right edge, vertically centered */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) {
              const base = panelPos ?? safeDefault();
              const resolved = placePanel(base);
              setPanelPos(resolved);
              localStorage.setItem(POSITION_STORAGE, JSON.stringify(resolved));
            }
            return next;
          });
        }}
        aria-label="Couleur des cartes du catalogue"
        className="fixed right-2 top-1/2 z-[60] flex h-12 w-12 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border border-border shadow-[0_10px_30px_hsl(var(--primary)/0.45)] backdrop-blur-xl transition-all hover:scale-110 sm:right-3"
      >
        <span
          className="absolute inset-0 opacity-80"
          style={{
            background: "conic-gradient(from 0deg,#00ffff,#ff00d4,#ffd700,#39ff14,#00ffff)",
            backgroundSize: "300% 300%",
            animation: "lovanet-bg-shift 6s ease infinite",
          }}
        />
        <span className="relative z-10 text-white drop-shadow">
          {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </span>
      </button>
    </>
  );
};

export default CatalogCardColorBubble;