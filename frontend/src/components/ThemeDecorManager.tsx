import { useEffect, useMemo, useState } from "react";
import { Check, LayoutGrid, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePerformance } from "@/contexts/PerformanceContext";

const DECOR_GROUPS = [
  {
    group: "marine",
    label: "Océan",
    items: [
      { key: "seaweed-grove", label: "Algues luminescentes", description: "Vagues d'algues flottantes et lueurs sous-marines." },
      { key: "bubble-ring", label: "Anneau de bulles", description: "Bulle géante et éclats de fougue aquatique." },
      { key: "anchor-glow", label: "Ancre mystique", description: "Ancre brillante entourée de petites particules." },
      { key: "coral-reef", label: "Corail vivant", description: "Récif animé et coraux pulsants." },
      { key: "tidal-stream", label: "Courant" , description: "Flaques fluides et lignes de courant dansantes." },
    ],
  },
  {
    group: "train",
    label: "Train",
    items: [
      { key: "platform-sign", label: "Panneau animé", description: "Signalisation lumineuse clignotante." },
      { key: "rail-arc", label: "Arc ferroviaire", description: "Arc lumineux et rails énergétiques." },
      { key: "signal-beam", label: "Faisceau signal", description: "Rayons dynamiques au-dessus du quai." },
      { key: "station-holo", label: "Holo gare", description: "Façade holographique et plateforme flottante." },
      { key: "train-pulse", label: "Onde train", description: "Trace d'impulsion le long des rails." },
    ],
  },
  {
    group: "ferry",
    label: "Ferry",
    items: [
      { key: "pier-light", label: "Lumière de quai", description: "Balises marines et reflets sur l'eau." },
      { key: "hull-shimmer", label: "Carène scintillante", description: "Surface de coque phosphorescente." },
      { key: "sail-flare", label: "Voile en flare", description: "Voile légère et éclat solaire." },
      { key: "buoy-halo", label: "Bouée holographique", description: "Bouée lumineuse circonscrite de particules." },
      { key: "wake-ripple", label: "Sillage animé", description: "Onde de déplacement et volutes d'écume." },
    ],
  },
  {
    group: "city",
    label: "Cité",
    items: [
      { key: "skyline-glow", label: "Skyline néon", description: "Horizon urbain brillant et vitres animées." },
      { key: "billboard-holo", label: "Panneau holo", description: "Publicité 3D en mouvement." },
      { key: "drone-orbit", label: "Drone orbitant", description: "Drones en rotation autour du quartier." },
      { key: "street-grid", label: "Grille tech", description: "Grille de rue en néon et segments temps réel." },
      { key: "monorail", label: "Monorail", description: "Trace de monorail fluide et lumineuse." },
    ],
  },
  {
    group: "forest",
    label: "Forêt",
    items: [
      { key: "mushroom-glow", label: "Champignons", description: "Champignons lumineux et spores flottants." },
      { key: "leaf-drift", label: "Feuilles", description: "Feuilles ondoyantes et poussière de brume." },
      { key: "branch-arc", label: "Branchages", description: "Arches de bois et lianes animées." },
      { key: "moss-fog", label: "Brume mousse", description: "Brume douce et éclats de verdure." },
      { key: "crystal-grove", label: "Bosquet de cristal", description: "Cristaux vivants au milieu de la clairière." },
    ],
  },
  {
    group: "tech",
    label: "Tech",
    items: [
      { key: "circuit-node", label: "Noeud circuit", description: "Nœud électronique pulsant en réseau." },
      { key: "holo-arc", label: "Arc holo", description: "Arc de données en trois dimensions." },
      { key: "pulse-beam", label: "Faisceau pulse", description: "Rayon lumineux vibrant en flux." },
      { key: "data-column", label: "Colonne data", description: "Colonne d'informations scintillante." },
      { key: "fractal-ring", label: "Anneau fractal", description: "Anneau géométrique tournant." },
    ],
  },
  {
    group: "space",
    label: "Cosmos",
    items: [
      { key: "starfield", label: "Champ d'étoiles", description: "Constellation de points brillants." },
      { key: "nebula-drift", label: "Nébuleuse", description: "Voile colorée et souffle spatial." },
      { key: "asteroid", label: "Astéroïde", description: "Roches flottantes aux lueurs froides." },
      { key: "comet", label: "Comète", description: "Queue de lumière traversant le ciel." },
      { key: "planet-ring", label: "Anneau planétaire", description: "Anneau tournoyant autour d'un globe." },
    ],
  },
  {
    group: "temple",
    label: "Temple",
    items: [
      { key: "lantern-float", label: "Lanternes", description: "Lanternes flottantes et reflets mystiques." },
      { key: "stone-gate", label: "Porte ancienne", description: "Porte monolithique et runes gravées." },
      { key: "statue-glow", label: "Statue", description: "Statue chargée d'énergie sacrée." },
      { key: "scroll-banner", label: "Bannière parchemin", description: "Bannière drapée et calligraphie brillante." },
      { key: "prism-stone", label: "Pierre prisme", description: "Prismes colorés et facettes scintillantes." },
    ],
  },
  {
    group: "ice",
    label: "Glace",
    items: [
      { key: "glacier-shard", label: "Éclat glacier", description: "Cristal de glace et reflets froids." },
      { key: "frost-ribbon", label: "Ruban de givre", description: "Bande de glace flottante." },
      { key: "snow-halo", label: "Halo neige", description: "Couronne de neige étincelante." },
      { key: "ice-mirror", label: "Miroir gelé", description: "Surface réfléchissante translucide." },
      { key: "polar-beam", label: "Rayon polaire", description: "Lumière froide en faisceau vertical." },
    ],
  },
  {
    group: "retro",
    label: "Retro",
    items: [
      { key: "neon-synth", label: "Synthwave", description: "Lignes néon et éclairage rétro." },
      { key: "pixel-grid", label: "Grille pixel", description: "Réseau en damier lumineux." },
      { key: "audio-wave", label: "Onde audio", description: "Onde visuelle rythmique et pulsante." },
      { key: "arcade-sign", label: "Panneau arcade", description: "Panneau lumineux vintage animé." },
      { key: "cassette-ribbon", label: "Ruban cassette", description: "Ruban coloré qui ondule." },
    ],
  },
];

const STORAGE_KEY = "lovanet:decor-selection";
const ALL_KEYS = DECOR_GROUPS.flatMap((group) => group.items.map((item) => item.key));
const CUSTOM_DECORS_KEY = "lovanet:custom-decors-enabled";

const getStored = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    const parsed = Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
    return parsed.length ? parsed : ALL_KEYS;
  } catch {
    return ALL_KEYS;
  }
};

const generateDecorItems = () => DECOR_GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, category: group.label })));
const DECOR_MODELS = generateDecorItems();

export function ThemeDecorManager() {
  const { disableAnimations } = usePerformance();
  const [activeDecorIds, setActiveDecorIds] = useState<string[]>(getStored);
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Tous");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activeDecorIds));
    document.body.dataset.activeDecors = activeDecorIds.join(",");
    if (activeDecorIds.length) {
      document.body.setAttribute("data-custom-decors", "1");
      window.localStorage.setItem(CUSTOM_DECORS_KEY, "1");
    } else {
      document.body.removeAttribute("data-custom-decors");
      window.localStorage.setItem(CUSTOM_DECORS_KEY, "0");
    }
    window.dispatchEvent(new Event("lovanet:decor-update"));
  }, [activeDecorIds]);

  const toggleDecor = (id: string) => {
    setActiveDecorIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const activeCount = activeDecorIds.length;
  const categoryOptions = useMemo(() => ["Tous", ...DECOR_GROUPS.map((group) => group.label)], []);
  const filteredModels = useMemo(() => {
    return DECOR_MODELS.filter((item) => {
      const matchesCategory = category === "Tous" || item.category === category;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || item.label.toLowerCase().includes(query) || item.description.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <div className="fixed bottom-6 left-6 z-[110] flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_80px_rgba(15,23,42,0.55)] backdrop-blur-xl border border-white/20 hover:shadow-[0_20px_90px_rgba(59,130,246,0.45)]"
      >
        <LayoutGrid size={16} />
        Décors 3D {activeCount ? `(${activeCount})` : ""}
      </button>

      {visible && (
        <div className="w-[320px] rounded-[1.75rem] border border-white/10 bg-black/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-3xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">Catalogue</div>
              <div className="text-sm font-semibold text-white">Décors interactifs</div>
            </div>
            <div className="rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase text-white/60">{disableAnimations ? "Économie" : "Animation"}</div>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Search size={14} className="text-white/50" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un décor..."
              className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {categoryOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full px-3 py-1 text-[11px] transition ${category === item ? "bg-white text-slate-950" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
              >
                {item}
              </button>
            ))}
          </div>

          <ScrollArea className="max-h-[320px] rounded-3xl pr-2">
            <div className="space-y-2">
              {filteredModels.map((model) => {
                const enabled = activeDecorIds.includes(model.key);
                return (
                  <button
                    key={model.key}
                    type="button"
                    onClick={() => toggleDecor(model.key)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      enabled
                        ? "border-sky-400/50 bg-sky-500/10 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{model.label}</div>
                        <div className="mt-1 text-[11px] text-white/50 leading-5 line-clamp-2">{model.description}</div>
                      </div>
                      {enabled ? <Check size={16} className="text-sky-300" /> : <Sparkles size={16} className="text-white/40" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-xs text-white/60 hover:text-white"
              onClick={() => setActiveDecorIds(DECOR_MODELS.map((item) => item.key))}
            >
              Tout activer
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-xs text-white/60 hover:text-white"
              onClick={() => setActiveDecorIds([])}
            >
              Tout désactiver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
