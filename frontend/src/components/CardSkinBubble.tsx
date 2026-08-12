import { useEffect, useRef, useState } from "react";
import { Layers, Move, X } from "lucide-react";

/**
 * Floating bubble (bottom-left) that themes catalog/preview CARDS.
 * Sets CSS variables --card-skin-bg / --card-skin-fg / --card-skin-border
 * which the AnimeCatalog cards consume. Default: white bg, black text.
 */
type Skin = {
  key: string;
  label: string;
  bg: string;
  fg: string;
  border: string;
  swatch: string;
};

const SKINS: Skin[] = [
  { key: "white",   label: "Blanc",    bg: "#ffffff", fg: "#0a0a0a", border: "rgba(0,0,0,0.12)", swatch: "#ffffff" },
  { key: "ivory",   label: "Ivoire",   bg: "#fffbe6", fg: "#1a1a00", border: "rgba(0,0,0,0.15)", swatch: "#fffbe6" },
  { key: "black",   label: "Noir",     bg: "#0a0a0a", fg: "#fafafa", border: "rgba(255,255,255,0.15)", swatch: "#0a0a0a" },
  { key: "graphite",label: "Graphite", bg: "#1c1c22", fg: "#f1f1f5", border: "rgba(255,255,255,0.12)", swatch: "#1c1c22" },
  { key: "cream",   label: "Crème",    bg: "#f5e6c8", fg: "#2a1a05", border: "rgba(0,0,0,0.15)", swatch: "#f5e6c8" },
  { key: "rose",    label: "Rose",     bg: "#ffe0ec", fg: "#3a0a20", border: "rgba(236,72,153,0.35)", swatch: "#ffe0ec" },
  { key: "sky",     label: "Ciel",     bg: "#e0f2ff", fg: "#06243d", border: "rgba(59,130,246,0.35)", swatch: "#e0f2ff" },
  { key: "mint",    label: "Menthe",   bg: "#e0ffe9", fg: "#063a1a", border: "rgba(34,197,94,0.35)", swatch: "#e0ffe9" },
  { key: "lavender",label: "Lavande",  bg: "#ece0ff", fg: "#1a0a3a", border: "rgba(139,92,246,0.35)", swatch: "#ece0ff" },
  { key: "fluo-pink",  label: "Fluo Rose",  bg: "#ff00d4", fg: "#ffffff", border: "rgba(255,0,212,0.7)", swatch: "#ff00d4" },
  { key: "fluo-cyan",  label: "Fluo Cyan",  bg: "#00ffff", fg: "#001a1a", border: "rgba(0,255,255,0.7)", swatch: "#00ffff" },
  { key: "fluo-green", label: "Fluo Vert",  bg: "#39ff14", fg: "#001a00", border: "rgba(57,255,20,0.7)", swatch: "#39ff14" },
  { key: "fluo-yellow",label: "Fluo Jaune", bg: "#ffff33", fg: "#1a1a00", border: "rgba(255,255,51,0.7)", swatch: "#ffff33" },
  {
    key: "holo",
    label: "Holo",
    bg: "linear-gradient(135deg,#ff71ce,#01cdfe,#05ffa1,#b967ff,#ff71ce)",
    fg: "#0a0a0a",
    border: "rgba(255,255,255,0.5)",
    swatch: "linear-gradient(135deg,#ff71ce,#01cdfe,#05ffa1,#b967ff)",
  },
  {
    key: "gold",
    label: "Or",
    bg: "linear-gradient(135deg,#fde68a,#f59e0b,#fde68a)",
    fg: "#2a1a00",
    border: "rgba(245,158,11,0.6)",
    swatch: "linear-gradient(135deg,#fde68a,#f59e0b)",
  },
  {
    key: "rgb",
    label: "RGB",
    bg: "linear-gradient(135deg,#ff0080,#7928ca,#0070f3,#00d4ff,#39ff14,#ffd700,#ff0080)",
    fg: "#ffffff",
    border: "rgba(255,255,255,0.5)",
    swatch: "conic-gradient(from 0deg,#ff0080,#7928ca,#0070f3,#00d4ff,#39ff14,#ffd700,#ff0080)",
  },
];

const STORAGE = "lovanet:card-skin";
// v3 key forces refresh from old overlapping positions
const POSITION_STORAGE = "lovanet:card-skin-pos-v3";

const PANEL_W = 290;
const VIEWPORT_MARGIN = 16;
const SIDE_SAFE_OFFSET = 92;

/** Returns a position that keeps the panel on screen and clear of the bottom-left settings panel. */
const safeDefault = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const panelW = Math.min(Math.round(w * 0.9), PANEL_W);
  const rightInset = w >= 1024 ? SIDE_SAFE_OFFSET : SIDE_SAFE_OFFSET + 10;
  return {
    x: Math.max(VIEWPORT_MARGIN, w - panelW - rightInset),
    y: w < 600 ? 24 : Math.max(VIEWPORT_MARGIN, Math.round(h * 0.08)),
  };
};

/** Clamp a saved position so it stays fully visible after a resize or device change. */
const clampPos = (x: number, y: number) => ({
  x: Math.min(Math.max(x, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerWidth - Math.min(Math.round(window.innerWidth * 0.9), PANEL_W) - VIEWPORT_MARGIN)),
  y: Math.min(Math.max(y, VIEWPORT_MARGIN), window.innerHeight - (window.innerWidth >= 1024 ? 160 : 220)),
});

type PanelRect = { x: number; y: number; w: number; h: number };
const REGISTRY_KEY = "__lovanetOpenBubblePanels";
const REGISTRY_EVENT = "lovanet:bubble-registry-change";
const PANEL_ID = "card-skin";
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

    let nextX = hit.x - rect.w - gap;
    if (nextX < VIEWPORT_MARGIN) {
      nextX = hit.x + hit.w + gap;
    }
    if (nextX > window.innerWidth - rect.w - VIEWPORT_MARGIN) {
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
  r.setProperty("--card-skin-bg", s.bg);
  r.setProperty("--card-skin-fg", s.fg);
  r.setProperty("--card-skin-border", s.border);
};

export const CardSkinBubble = () => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("white");
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const estimatePanelSize = () => ({
    w: Math.min(Math.round(window.innerWidth * 0.9), PANEL_W),
    h: 250,
  });

  const placePanel = (base: { x: number; y: number }) => {
    const size = panelRef.current
      ? { w: panelRef.current.offsetWidth, h: panelRef.current.offsetHeight }
      : estimatePanelSize();
    const clamped = clampPos(base.x, base.y);
    return resolveNonOverlapping(PANEL_ID, clamped.x, clamped.y, size.w, size.h);
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE) ?? "white";
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
          className="fixed z-[10050] touch-none rounded-2xl border border-white/40 bg-white/20 p-3 text-white shadow-[0_20px_56px_rgba(0,0,0,0.3)] backdrop-blur-2xl w-[min(90vw,290px)]"
          style={{ left: `${panelPos.x}px`, top: `${panelPos.y}px` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="mb-2 flex cursor-grab select-none items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.25em] text-white/70">
              <Move className="h-3.5 w-3.5" />
              Apparence des cartes
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le panneau apparence des cartes"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/90 transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3 sm:grid-cols-6">
            {SKINS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => pick(s)}
                title={s.label}
                aria-label={s.label}
                className={`relative h-10 w-10 rounded-full border border-white/35 transition-transform hover:scale-110 sm:h-9 sm:w-9 ${
                  active === s.key ? "ring-2 ring-white ring-offset-2 ring-offset-transparent" : ""
                }`}
                style={{ background: s.swatch }}
              />
            ))}
          </div>
          <p className="mt-2 px-1 text-[10px] text-white/60">
            {SKINS.find((s) => s.key === active)?.label}
          </p>
        </div>
      )}
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
        aria-label="Apparence des cartes"
        className="fixed bottom-5 left-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card/90 shadow-[0_10px_30px_hsl(var(--primary)/0.45)] backdrop-blur-xl transition-all hover:scale-110 sm:left-5"
      >
        {open ? <X className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
      </button>
    </>
  );
};

export default CardSkinBubble;