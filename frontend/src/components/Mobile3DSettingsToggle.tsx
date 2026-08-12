import { useEffect, useState } from "react";
import { Eye, EyeOff, Video, VideoOff, Check } from "lucide-react";
import { usePerformance } from "@/contexts/PerformanceContext";

const DECOR_GROUPS = [
  { group: "marine", label: "🌊 Océan", emoji: "🌊", color: "#38bdf8", items: [
    { key: "seaweed-grove", label: "Algues" }, { key: "bubble-ring", label: "Bulles" },
    { key: "anchor-glow", label: "Ancre" }, { key: "coral-reef", label: "Corail" },
    { key: "tidal-stream", label: "Courant" },
  ]},
  { group: "train", label: "🚂 Train", emoji: "🚂", color: "#f59e0b", items: [
    { key: "platform-sign", label: "Panneau" }, { key: "rail-arc", label: "Arc rail" },
    { key: "signal-beam", label: "Signal" }, { key: "station-holo", label: "Holo gare" },
    { key: "train-pulse", label: "Onde train" },
  ]},
  { group: "ferry", label: "⛴ Ferry", emoji: "⛴", color: "#0ea5e9", items: [
    { key: "pier-light", label: "Quai" }, { key: "hull-shimmer", label: "Carène" },
    { key: "sail-flare", label: "Voile" }, { key: "buoy-halo", label: "Bouée" },
    { key: "wake-ripple", label: "Sillage" },
  ]},
  { group: "city", label: "🏙 Cité", emoji: "🏙", color: "#a855f7", items: [
    { key: "skyline-glow", label: "Skyline" }, { key: "billboard-holo", label: "Billboard" },
    { key: "drone-orbit", label: "Drone" }, { key: "street-grid", label: "Grille" },
    { key: "monorail", label: "Monorail" },
  ]},
  { group: "forest", label: "🌿 Forêt", emoji: "🌿", color: "#22c55e", items: [
    { key: "mushroom-glow", label: "Champignons" }, { key: "leaf-drift", label: "Feuilles" },
    { key: "branch-arc", label: "Branches" }, { key: "moss-fog", label: "Brume" },
    { key: "crystal-grove", label: "Cristaux" },
  ]},
  { group: "tech", label: "⚡ Tech", emoji: "⚡", color: "#06b6d4", items: [
    { key: "circuit-node", label: "Circuit" }, { key: "holo-arc", label: "Holo arc" },
    { key: "pulse-beam", label: "Faisceau" }, { key: "data-column", label: "Data" },
    { key: "fractal-ring", label: "Fractal" },
  ]},
  { group: "space", label: "🌌 Cosmos", emoji: "🌌", color: "#818cf8", items: [
    { key: "starfield", label: "Étoiles" }, { key: "nebula-drift", label: "Nébuleuse" },
    { key: "asteroid", label: "Astéroïde" }, { key: "comet", label: "Comète" },
    { key: "planet-ring", label: "Planète" },
  ]},
  { group: "temple", label: "⛩ Temple", emoji: "⛩", color: "#f97316", items: [
    { key: "lantern-float", label: "Lanternes" }, { key: "stone-gate", label: "Porte" },
    { key: "statue-glow", label: "Statue" }, { key: "scroll-banner", label: "Parchemin" },
    { key: "prism-stone", label: "Prisme" },
  ]},
  { group: "ice", label: "❄️ Glace", emoji: "❄️", color: "#bae6fd", items: [
    { key: "glacier-shard", label: "Glacier" }, { key: "frost-ribbon", label: "Givre" },
    { key: "snow-halo", label: "Neige" }, { key: "ice-mirror", label: "Miroir" },
    { key: "polar-beam", label: "Polaire" },
  ]},
  { group: "retro", label: "🕹 Retro", emoji: "🕹", color: "#ec4899", items: [
    { key: "neon-synth", label: "Synthwave" }, { key: "pixel-grid", label: "Pixel" },
    { key: "audio-wave", label: "Audio" }, { key: "arcade-sign", label: "Arcade" },
    { key: "cassette-ribbon", label: "Cassette" },
  ]},
];

const ALL_KEYS = DECOR_GROUPS.flatMap((g) => g.items.map((i) => i.key));
const STORAGE_KEY = "lovanet:decor-selection";
const CUSTOM_DECORS_KEY = "lovanet:custom-decors-enabled";

const getStored = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const parsed = Array.isArray(v) ? v.filter((x: unknown) => typeof x === "string") : [];
    return parsed.length ? parsed : ALL_KEYS;
  }
  catch { return ALL_KEYS; }
};

/** Animated transparent orb icon */
function OrbIcon({ anyOff }: { anyOff: boolean }) {
  return (
    <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
      {/* outer ring */}
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: "1.5px solid rgba(255,255,255,0.45)",
        animation: "lv-orb-spin 6s linear infinite",
        boxShadow: anyOff ? "0 0 10px rgba(255,255,255,0.5)" : "0 0 14px rgba(255,255,255,0.55)",
      }} />
      {/* inner dot */}
      <span style={{
        width: 10, height: 10, borderRadius: "50%",
        background: "rgba(255,255,255,0.92)",
        boxShadow: anyOff ? "0 0 12px rgba(255,255,255,0.75)" : "0 0 16px rgba(255,255,255,0.8)",
        animation: "lv-orb-pulse 2s ease-in-out infinite",
      }} />
      {/* orbit dot */}
      <span style={{
        position: "absolute", width: 5, height: 5, borderRadius: "50%",
        background: "#ffffff",
        top: 1, left: "50%", transformOrigin: "0 12px",
        animation: "lv-orb-spin 3s linear infinite reverse",
        boxShadow: "0 0 8px rgba(255,255,255,0.9)",
      }} />
    </span>
  );
}

export function Mobile3DSettingsToggle() {
  const { disableAnimations, disableVideos, decorOverlayEnabled, toggleAnimations, toggleDecorOverlay, toggleVideos } = usePerformance();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"controls" | "decors">("controls");
  const [activeDecors, setActiveDecors] = useState<string[]>(getStored);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(activeDecors)); } catch {}
    document.body.dataset.activeDecors = activeDecors.join(",");
    if (activeDecors.length) {
      document.body.setAttribute("data-custom-decors", "1");
      try { localStorage.setItem(CUSTOM_DECORS_KEY, "1"); } catch {}
    } else {
      document.body.removeAttribute("data-custom-decors");
      try { localStorage.setItem(CUSTOM_DECORS_KEY, "0"); } catch {}
    }
    window.dispatchEvent(new Event("lovanet:decor-update"));
  }, [activeDecors]);

  // If user enables decors from the orb panel while animations are disabled, re-enable animations.
  useEffect(() => {
    if (activeDecors.length > 0 && disableAnimations) {
      try { toggleAnimations(); } catch {}
    }
  }, [activeDecors, disableAnimations, toggleAnimations]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const DEFAULT_ACTIVE_DECORS = [
  "skyline-glow",
  "billboard-holo",
  "drone-orbit",
  "starfield",
  "nebula-drift",
];

  const handleToggleDecorOverlay = () => {
    if (!decorOverlayEnabled && activeDecors.length === 0) {
      setActiveDecors(DEFAULT_ACTIVE_DECORS);
    }
    toggleDecorOverlay();
  };

  const toggleDecor = (key: string) =>
    setActiveDecors((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const toggleGroup = (group: typeof DECOR_GROUPS[0]) => {
    const groupKeys = group.items.map((i) => i.key);
    const allOn = groupKeys.every((k) => activeDecors.includes(k));
    setActiveDecors((prev) =>
      allOn ? prev.filter((k) => !groupKeys.includes(k)) : [...new Set([...prev, ...groupKeys])]
    );
  };

  const groupActive = (group: typeof DECOR_GROUPS[0]) => {
    const keys = group.items.map((i) => i.key);
    const count = keys.filter((k) => activeDecors.includes(k)).length;
    return { all: count === keys.length, some: count > 0 && count < keys.length, count };
  };

  const anyOff = !decorOverlayEnabled || disableVideos;
  const buttonRight = isDesktop ? 24 : 14;
  const panelBottom = isDesktop ? 170 : 220;

  return (
    <>
      <style>{`
        @keyframes lv-orb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes lv-orb-pulse { 0%,100% { transform: scale(1); opacity:0.85; } 50% { transform: scale(1.3); opacity:1; } }
      `}</style>
      {/* Main orb button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Arrière-plans et décors"
        style={{
          position: "fixed",
          bottom: isDesktop ? 104 : 84,
          right: buttonRight,
          zIndex: 9999,
          width: 54, height: 54, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(16px)",
          boxShadow: anyOff
            ? "0 0 24px rgba(255,255,255,0.35), 0 8px 32px rgba(0,0,0,0.4)"
            : "0 0 28px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.4)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "box-shadow 0.3s, background 0.3s",
        }}
      >
        <OrbIcon anyOff={anyOff} />
      </button>

      {/* Panel — independently centered on screen */}
      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: panelBottom,
          right: isDesktop ? 96 : 86,
          left: "auto",
          zIndex: 10050,
          background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.40)",
          borderRadius: 20, padding: "12px 12px 10px",
          width: isDesktop ? 320 : "min(86vw, 320px)",
          maxHeight: "min(78vh, 620px)",
          backdropFilter: "blur(22px) saturate(1.14)", boxShadow: "0 20px 56px rgba(0,0,0,0.3)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 5 }}>
              {(["controls", "decors"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} style={{
                  flex: 1, padding: "6px 0", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  border: tab === t ? "1px solid rgba(255,255,255,0.45)" : "1px solid rgba(255,255,255,0.08)",
                  background: tab === t ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.03)",
                  color: tab === t ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)", cursor: "pointer",
                }}>
                  {t === "controls" ? "Réglages" : `Ambiance (${activeDecors.length})`}
                </button>
              ))}
            </div>

            {tab === "controls" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                <button type="button" onClick={toggleVideos} aria-pressed={!disableVideos} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 11,
                  border: `1px solid ${disableVideos ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.36)"}`,
                  background: disableVideos ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)",
                  color: "rgba(255,255,255,0.9)", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  minHeight: 58,
                }}>
                  {disableVideos ? <VideoOff size={14} /> : <Video size={14} />}
                  <span style={{ lineHeight: 1.15 }}>{disableVideos ? "Vidéo fond OFF" : "Vidéo fond ON"}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, borderRadius: 999, padding: "2px 7px", border: "1px solid rgba(255,255,255,0.24)", background: "rgba(255,255,255,0.08)", color: "#fff" }}>
                    {disableVideos ? "OFF" : "ON"}
                  </span>
                </button>
                <button type="button" onClick={handleToggleDecorOverlay} aria-pressed={decorOverlayEnabled} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 11,
                  border: `1px solid ${!decorOverlayEnabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.36)"}`,
                  background: !decorOverlayEnabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.16)",
                  color: "rgba(255,255,255,0.92)", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  minHeight: 58,
                }}>
                  {!decorOverlayEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span style={{ lineHeight: 1.15 }}>{!decorOverlayEnabled ? "Décors 3D OFF" : "Décors 3D ON"}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, borderRadius: 999, padding: "2px 7px", border: "1px solid rgba(255,255,255,0.26)", background: "rgba(255,255,255,0.1)", color: "#fff" }}>
                    {!decorOverlayEnabled ? "OFF" : "ON"}
                  </span>
                </button>
              </div>
            )}

            {tab === "decors" && (
              <>
                <div style={{ maxHeight: "min(48vh, 360px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 2 }}>
                  {DECOR_GROUPS.map((g) => {
                    const status = groupActive(g);
                    const isExpanded = expandedGroup === g.group;
                    return (
                      <div key={g.group} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
                        {/* Group header row */}
                        <div style={{ display: "flex", alignItems: "center" }}>
                          {/* Group toggle (activate/deactivate entire group) */}
                          <button
                            type="button"
                            onClick={() => toggleGroup(g)}
                            title={status.all ? "Désactiver le groupe" : "Activer le groupe"}
                            style={{
                              flexShrink: 0, width: 36, height: 36, border: "none",
                              background: "transparent", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 14,
                            }}
                          >
                            <span style={{
                              width: 14, height: 14, borderRadius: 4,
                              border: `1.5px solid ${status.all ? "#ffffff" : status.some ? "#ffffff" : "rgba(255,255,255,0.2)"}`,
                              background: status.all ? "rgba(255,255,255,0.95)" : status.some ? "rgba(255,255,255,0.45)" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {status.all && <Check size={9} color="#000" />}
                              {status.some && <span style={{ width: 6, height: 2, background: "#fff", borderRadius: 2, display: "block" }} />}
                            </span>
                          </button>

                          {/* Group label (expand/collapse) */}
                          <button
                            type="button"
                            onClick={() => setExpandedGroup(isExpanded ? null : g.group)}
                            style={{
                              flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
                              gap: 6, padding: "7px 10px 7px 4px", border: "none",
                              background: "transparent", cursor: "pointer",
                              color: status.some || status.all ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.55)",
                              fontSize: 12, fontWeight: 600,
                            }}
                          >
                            <span>{g.label} {status.count > 0 ? <span style={{ fontSize: 10, color: "#fff" }}>({status.count})</span> : null}</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                          </button>
                        </div>

                        {/* Individual items */}
                        {isExpanded && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "6px 10px 10px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            {g.items.map((item) => {
                              const on = activeDecors.includes(item.key);
                              return (
                                <button
                                  key={item.key}
                                  type="button"
                                  onClick={() => toggleDecor(item.key)}
                                  style={{
                                    padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                                    border: `1px solid ${on ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.1)"}`,
                                    background: on ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.03)",
                                    color: on ? "#ffffff" : "rgba(255,255,255,0.6)",
                                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                                  }}
                                >
                                  {on && <Check size={10} />} {item.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Global actions */}
                <div style={{ display: "flex", gap: 5, paddingTop: 2 }}>
                  <button type="button" onClick={() => setActiveDecors(ALL_KEYS)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 10, fontSize: 11, fontWeight: 600,
                    border: "1px solid rgba(255,255,255,0.32)", background: "rgba(255,255,255,0.12)",
                    color: "#ffffff", cursor: "pointer",
                  }}>Tout activer</button>
                  <button type="button" onClick={() => setActiveDecors([])} style={{
                    flex: 1, padding: "7px 0", borderRadius: 10, fontSize: 11, fontWeight: 600,
                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.45)", cursor: "pointer",
                  }}>Tout effacer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

