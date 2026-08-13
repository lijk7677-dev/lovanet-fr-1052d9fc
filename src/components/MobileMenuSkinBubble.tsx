import { useEffect, useState } from "react";
import { PanelsTopLeft, X } from "lucide-react";
import { DetachedBubblePanel } from "@/components/DetachedBubblePanel";

/**
 * Bulle flottante : personnalisation du MENU MOBILE (grand panneau, sections, texte).
 * Applique les variables CSS --mnav-panel / --mnav-section / --mnav-text / --mnav-border.
 */
type Preset = {
  key: string;
  label: string;
  panel: string;
  section: string;
  text: string;
  border: string;
};

const PRESETS: Preset[] = [
  { key: "clear", label: "Transparent total", panel: "rgba(0,0,0,0)", section: "rgba(255,255,255,0.04)", text: "#ffffff", border: "rgba(255,255,255,0.14)" },
  { key: "glass", label: "Verre clair", panel: "rgba(255,255,255,0.06)", section: "rgba(255,255,255,0.08)", text: "#ffffff", border: "rgba(255,255,255,0.22)" },
  { key: "frost", label: "Givre", panel: "rgba(255,255,255,0.12)", section: "rgba(255,255,255,0.14)", text: "#0a0a0a", border: "rgba(0,0,0,0.15)" },
  { key: "smoke", label: "Fumée", panel: "rgba(10,10,12,0.18)", section: "rgba(255,255,255,0.05)", text: "#f4f4f5", border: "rgba(255,255,255,0.16)" },
  { key: "ink", label: "Encre", panel: "rgba(5,6,10,0.35)", section: "rgba(255,255,255,0.06)", text: "#e8eaf2", border: "rgba(255,255,255,0.14)" },
  { key: "midnight", label: "Minuit", panel: "rgba(9,13,32,0.35)", section: "rgba(30,41,90,0.25)", text: "#dbeafe", border: "rgba(99,102,241,0.35)" },
  { key: "ocean", label: "Océan", panel: "rgba(3,32,54,0.32)", section: "rgba(14,116,144,0.22)", text: "#cffafe", border: "rgba(34,211,238,0.35)" },
  { key: "lagoon", label: "Lagon", panel: "rgba(4,44,52,0.30)", section: "rgba(13,148,136,0.22)", text: "#ccfbf1", border: "rgba(45,212,191,0.38)" },
  { key: "azure", label: "Azur", panel: "rgba(8,47,73,0.32)", section: "rgba(56,189,248,0.18)", text: "#e0f2fe", border: "rgba(125,211,252,0.4)" },
  { key: "royal", label: "Bleu roi", panel: "rgba(12,24,80,0.34)", section: "rgba(37,99,235,0.22)", text: "#dbeafe", border: "rgba(59,130,246,0.4)" },
  { key: "indigo", label: "Indigo", panel: "rgba(24,20,72,0.34)", section: "rgba(99,102,241,0.20)", text: "#e0e7ff", border: "rgba(129,140,248,0.4)" },
  { key: "violet", label: "Violet", panel: "rgba(38,16,66,0.34)", section: "rgba(139,92,246,0.20)", text: "#ede9fe", border: "rgba(167,139,250,0.4)" },
  { key: "plum", label: "Prune", panel: "rgba(48,14,54,0.34)", section: "rgba(168,85,247,0.18)", text: "#f3e8ff", border: "rgba(192,132,252,0.4)" },
  { key: "magenta", label: "Magenta", panel: "rgba(58,8,46,0.34)", section: "rgba(236,72,153,0.20)", text: "#fce7f3", border: "rgba(244,114,182,0.42)" },
  { key: "rose", label: "Rose", panel: "rgba(60,12,30,0.32)", section: "rgba(244,63,94,0.18)", text: "#ffe4e6", border: "rgba(251,113,133,0.4)" },
  { key: "crimson", label: "Cramoisi", panel: "rgba(56,8,12,0.34)", section: "rgba(220,38,38,0.20)", text: "#fee2e2", border: "rgba(248,113,113,0.4)" },
  { key: "ember", label: "Braise", panel: "rgba(52,18,4,0.34)", section: "rgba(234,88,12,0.20)", text: "#ffedd5", border: "rgba(251,146,60,0.42)" },
  { key: "amber", label: "Ambre", panel: "rgba(48,30,2,0.34)", section: "rgba(245,158,11,0.20)", text: "#fef3c7", border: "rgba(251,191,36,0.42)" },
  { key: "gold", label: "Or", panel: "rgba(38,28,0,0.36)", section: "rgba(255,215,0,0.16)", text: "#fff7cc", border: "rgba(255,215,0,0.45)" },
  { key: "lime", label: "Lime", panel: "rgba(26,38,2,0.34)", section: "rgba(132,204,22,0.20)", text: "#ecfccb", border: "rgba(163,230,53,0.42)" },
  { key: "emerald", label: "Émeraude", panel: "rgba(4,42,28,0.34)", section: "rgba(16,185,129,0.20)", text: "#d1fae5", border: "rgba(52,211,153,0.42)" },
  { key: "forest", label: "Forêt", panel: "rgba(6,32,18,0.36)", section: "rgba(22,101,52,0.25)", text: "#dcfce7", border: "rgba(74,222,128,0.35)" },
  { key: "jade", label: "Jade", panel: "rgba(2,38,34,0.34)", section: "rgba(20,184,166,0.20)", text: "#ccfbf1", border: "rgba(45,212,191,0.4)" },
  { key: "teal", label: "Sarcelle", panel: "rgba(2,30,36,0.34)", section: "rgba(13,148,136,0.20)", text: "#cffafe", border: "rgba(34,211,238,0.4)" },
  { key: "slate", label: "Ardoise", panel: "rgba(15,23,42,0.34)", section: "rgba(71,85,105,0.25)", text: "#e2e8f0", border: "rgba(148,163,184,0.35)" },
  { key: "graphite", label: "Graphite", panel: "rgba(24,24,27,0.38)", section: "rgba(63,63,70,0.28)", text: "#f4f4f5", border: "rgba(161,161,170,0.3)" },
  { key: "charcoal", label: "Charbon", panel: "rgba(12,12,14,0.45)", section: "rgba(39,39,42,0.35)", text: "#fafafa", border: "rgba(255,255,255,0.12)" },
  { key: "obsidian", label: "Obsidienne", panel: "rgba(0,0,0,0.55)", section: "rgba(20,20,24,0.5)", text: "#ffffff", border: "rgba(255,255,255,0.14)" },
  { key: "pearl", label: "Perle", panel: "rgba(255,255,255,0.20)", section: "rgba(255,255,255,0.28)", text: "#111827", border: "rgba(0,0,0,0.12)" },
  { key: "ivory", label: "Ivoire", panel: "rgba(255,251,230,0.22)", section: "rgba(255,251,230,0.30)", text: "#2a2200", border: "rgba(120,100,0,0.2)" },
  { key: "cream", label: "Crème", panel: "rgba(245,230,200,0.24)", section: "rgba(245,230,200,0.32)", text: "#2a1a05", border: "rgba(120,90,30,0.25)" },
  { key: "sand", label: "Sable", panel: "rgba(234,223,192,0.24)", section: "rgba(234,223,192,0.30)", text: "#3a2c10", border: "rgba(120,100,50,0.25)" },
  { key: "peach", label: "Pêche", panel: "rgba(255,217,192,0.22)", section: "rgba(255,217,192,0.30)", text: "#43200c", border: "rgba(200,120,80,0.3)" },
  { key: "blush", label: "Blush", panel: "rgba(255,224,236,0.22)", section: "rgba(255,224,236,0.30)", text: "#3a0a20", border: "rgba(236,72,153,0.3)" },
  { key: "skyline", label: "Ciel clair", panel: "rgba(224,242,255,0.22)", section: "rgba(224,242,255,0.30)", text: "#06243d", border: "rgba(59,130,246,0.3)" },
  { key: "mintlight", label: "Menthe claire", panel: "rgba(224,255,233,0.22)", section: "rgba(224,255,233,0.30)", text: "#063a1a", border: "rgba(34,197,94,0.3)" },
  { key: "lavlight", label: "Lavande claire", panel: "rgba(236,224,255,0.22)", section: "rgba(236,224,255,0.30)", text: "#1a0a3a", border: "rgba(139,92,246,0.3)" },
  { key: "neoncyan", label: "Néon cyan", panel: "rgba(0,20,26,0.35)", section: "rgba(0,255,255,0.12)", text: "#a5f3fc", border: "rgba(0,255,255,0.55)" },
  { key: "neonpink", label: "Néon rose", panel: "rgba(26,0,18,0.35)", section: "rgba(255,0,212,0.12)", text: "#fbcfe8", border: "rgba(255,0,212,0.55)" },
  { key: "neongreen", label: "Néon vert", panel: "rgba(4,20,4,0.35)", section: "rgba(57,255,20,0.12)", text: "#bbf7d0", border: "rgba(57,255,20,0.5)" },
  { key: "neonpurple", label: "Néon violet", panel: "rgba(16,4,28,0.35)", section: "rgba(191,0,255,0.12)", text: "#e9d5ff", border: "rgba(191,0,255,0.5)" },
  { key: "neonorange", label: "Néon orange", panel: "rgba(26,10,0,0.35)", section: "rgba(255,103,0,0.12)", text: "#fed7aa", border: "rgba(255,103,0,0.5)" },
  { key: "cyberpunk", label: "Cyberpunk", panel: "linear-gradient(160deg,rgba(255,0,128,0.22),rgba(0,212,255,0.18))", section: "rgba(255,255,255,0.06)", text: "#ffffff", border: "rgba(255,0,212,0.4)" },
  { key: "aurora", label: "Aurore", panel: "linear-gradient(160deg,rgba(5,255,161,0.16),rgba(1,205,254,0.16),rgba(185,103,255,0.16))", section: "rgba(255,255,255,0.06)", text: "#ecfeff", border: "rgba(120,255,214,0.35)" },
  { key: "sunset", label: "Coucher de soleil", panel: "linear-gradient(160deg,rgba(255,107,53,0.20),rgba(232,67,147,0.18))", section: "rgba(255,255,255,0.06)", text: "#fff1e6", border: "rgba(255,138,76,0.4)" },
  { key: "nebula", label: "Nébuleuse", panel: "linear-gradient(160deg,rgba(76,29,149,0.28),rgba(14,116,144,0.22))", section: "rgba(255,255,255,0.05)", text: "#ede9fe", border: "rgba(167,139,250,0.35)" },
  { key: "holo", label: "Holographique", panel: "linear-gradient(160deg,rgba(255,113,206,0.18),rgba(1,205,254,0.18),rgba(5,255,161,0.18))", section: "rgba(255,255,255,0.07)", text: "#ffffff", border: "rgba(255,255,255,0.4)" },
  { key: "goldnoir", label: "Or & noir", panel: "linear-gradient(160deg,rgba(0,0,0,0.5),rgba(201,168,76,0.18))", section: "rgba(201,168,76,0.10)", text: "#f5e6b8", border: "rgba(201,168,76,0.45)" },
  { key: "emeraldnoir", label: "Émeraude noire", panel: "linear-gradient(160deg,rgba(0,0,0,0.5),rgba(6,78,59,0.35))", section: "rgba(16,185,129,0.10)", text: "#d1fae5", border: "rgba(16,185,129,0.35)" },
  { key: "bluesteel", label: "Acier bleu", panel: "linear-gradient(160deg,rgba(15,27,61,0.42),rgba(59,111,160,0.25))", section: "rgba(255,255,255,0.06)", text: "#e8edf3", border: "rgba(125,180,235,0.35)" },
];

const STORAGE = "lovanet:mobile-menu-skin";

const apply = (p: Preset) => {
  const r = document.documentElement.style;
  r.setProperty("--mnav-panel", p.panel);
  r.setProperty("--mnav-section", p.section);
  r.setProperty("--mnav-text", p.text);
  r.setProperty("--mnav-border", p.border);
};

export const MobileMenuSkinBubble = () => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("clear");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE) ?? "clear";
    const p = PRESETS.find((x) => x.key === saved) ?? PRESETS[0];
    apply(p);
    setActive(p.key);
  }, []);

  const pick = (p: Preset) => {
    apply(p);
    localStorage.setItem(STORAGE, p.key);
    setActive(p.key);
  };

  const current = PRESETS.find((p) => p.key === active);

  return (
    <div className="relative flex items-center">
      <DetachedBubblePanel
        panelId="mobile-menu-skin"
        open={open}
        onClose={() => setOpen(false)}
        className="detached-bubble-panel--menu-skin"
      >
        <div className="p-3 text-white">
          <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/15 pb-2">
            <p className="px-1 text-[10px] uppercase tracking-[0.25em] text-white/70">
              Couleurs du menu mobile (50)
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le panneau couleurs du menu mobile"
              className="rounded-md border border-white/25 bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => pick(p)}
                title={p.label}
                aria-label={p.label}
                className={`relative h-11 w-full overflow-hidden rounded-lg border transition-transform hover:scale-105 ${
                  active === p.key ? "ring-2 ring-cyan-300/80 ring-offset-1 ring-offset-transparent" : ""
                }`}
                style={{
                  background: `${p.panel}, repeating-conic-gradient(hsl(var(--muted)) 0% 25%, hsl(var(--background)) 0% 50%) 0 0 / 10px 10px`,
                  borderColor: p.border,
                }}
              >
                {/* Miniature : mini-section + lignes de texte */}
                <span
                  className="absolute inset-x-1 top-1 h-3 rounded-[3px]"
                  style={{ background: p.section, border: `1px solid ${p.border}` }}
                />
                <span className="absolute inset-x-2 bottom-2 h-[3px] rounded-full" style={{ background: p.text }} />
                <span className="absolute inset-x-2 bottom-4 h-[3px] w-1/2 rounded-full opacity-70" style={{ background: p.text }} />
              </button>
            ))}
          </div>

          <p className="mt-2 px-1 text-[10px] text-white/65">{current?.label}</p>
        </div>
      </DetachedBubblePanel>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Couleurs du menu mobile"
        className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white shadow-[0_0_18px_rgba(255,255,255,0.18)] backdrop-blur-xl transition-all hover:scale-110 hover:bg-white/16"
      >
        {open ? <X className="h-5 w-5" /> : <PanelsTopLeft className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default MobileMenuSkinBubble;
