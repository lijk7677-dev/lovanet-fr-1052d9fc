import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";
import { Sparkles, Volume2, VolumeX, Play, SkipBack, SkipForward, Disc3, Theater, Building2 } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import FerryTrainCityPlaza from "@/components/FerryTrainCityPlaza";
import { TrainStationReplicaWorld } from "@/components/TrainStation";
import crystalCity from "@/assets/crystal-city.jpg.asset.json";
import blingBling from "@/assets/bling-bling.jpg.asset.json";
import lovanetLogo from "@/assets/lovanet-logo-v2.png.asset.json";

type LocalClip = {
  id: string;
  title: string;
  src: string;
  poster: string;
  vibe: "cinema" | "concert" | "night-city";
  note: string;
};

const LOCAL_CLIPS: LocalClip[] = [
  {
    id: "studio-cinema",
    title: "Studio Cinema Atmosphere",
    src: "/catalogue-banner.mp4",
    poster: crystalCity.url,
    vibe: "cinema",
    note: "Projection panoramique",
  },
  {
    id: "concert-visual",
    title: "Concert Lights Motion",
    src: "/leaderboard-banner.mp4",
    poster: blingBling.url,
    vibe: "concert",
    note: "Stage lumineux en mouvement",
  },
  {
    id: "city-main",
    title: "Neon City Performance",
    src: "/manga-universe-banner.mp4",
    poster: lovanetLogo.url,
    vibe: "night-city",
    note: "Ambiance urbaine premium",
  },
  {
    id: "collector-cut",
    title: "Collector Cut Showcase",
    src: "/custom_video_lovanet.mp4",
    poster: crystalCity.url,
    vibe: "cinema",
    note: "Cut exclusif local",
  },
];

const PANEL_STYLES = {
  cinema: {
    frame: "from-amber-300/30 via-orange-500/20 to-rose-500/30",
    glow: "shadow-[0_18px_60px_-28px_rgba(251,191,36,0.55)]",
    icon: Theater,
    label: "Mode Cinema",
  },
  concert: {
    frame: "from-cyan-300/30 via-fuchsia-500/20 to-indigo-500/30",
    glow: "shadow-[0_18px_60px_-28px_rgba(34,211,238,0.55)]",
    icon: Disc3,
    label: "Mode Concert",
  },
  "night-city": {
    frame: "from-sky-300/30 via-blue-500/20 to-violet-500/30",
    glow: "shadow-[0_18px_60px_-28px_rgba(96,165,250,0.52)]",
    icon: Building2,
    label: "Mode Night City",
  },
} as const;

const FERRY_SELECTED_ELEMENTS = [
  { id: 1, label: "Ferry principal", previewSrc: "/leaderboard-banner.mp4", previewPoster: crystalCity.url },
  { id: 5, label: "Coastal city", previewSrc: "/manga-universe-banner.mp4", previewPoster: blingBling.url },
  { id: 15, label: "Marina building", previewSrc: "/catalogue-banner.mp4", previewPoster: lovanetLogo.url },
  { id: 16, label: "Luxury yachts", previewSrc: "/custom_video_lovanet.mp4", previewPoster: crystalCity.url },
  { id: 19, label: "Mega cruise yacht", previewSrc: "/leaderboard-banner.mp4", previewPoster: blingBling.url },
  { id: 23, label: "Cargo ports", previewSrc: "/catalogue-banner.mp4", previewPoster: crystalCity.url },
  { id: 24, label: "Tropical island", previewSrc: "/manga-universe-banner.mp4", previewPoster: lovanetLogo.url },
];

const TRAIN_SELECTED_ELEMENTS = [
  { id: 6, label: "Animated TGV", previewSrc: "/catalogue-banner.mp4", previewPoster: blingBling.url },
  { id: 13, label: "Premium plaza life", previewSrc: "/custom_video_lovanet.mp4", previewPoster: crystalCity.url },
];

export default function LecteursVideo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [autoSlide, setAutoSlide] = useState(true);
  const [accent, setAccent] = useState<"cinema" | "concert" | "night-city">("cinema");
  const [sceneMode, setSceneMode] = useState<"ferry" | "train">("ferry");
  const [activeFerryElement, setActiveFerryElement] = useState<number>(FERRY_SELECTED_ELEMENTS[0].id);
  const [activeTrainElement, setActiveTrainElement] = useState<number>(TRAIN_SELECTED_ELEMENTS[0].id);
  const [liveScene, setLiveScene] = useState<"ferry" | "train" | "none">("ferry");
  const [autoElementTour, setAutoElementTour] = useState(true);
  const [spinBurst, setSpinBurst] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const orbitRef = useRef<any>(null);
  const tourRef = useRef<number | null>(null);
  const spinRef = useRef<number | null>(null);
  const elementButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const CAMERA_PRESETS = {
    ferry: [
      { label: "Marina",        pos: [22,  8, 10]  as [number,number,number], target: [-30, 0, 18]  as [number,number,number] },
      { label: "Yachts",        pos: [10,  6, 30]  as [number,number,number], target: [-36, 0, 18]  as [number,number,number] },
      { label: "Cargo",         pos: [40, 10, 50]  as [number,number,number], target: [0,   0, 0]   as [number,number,number] },
      { label: "Coastal city",  pos: [55, 18, -10] as [number,number,number], target: [20,  0, -20] as [number,number,number] },
      { label: "Tropical",      pos: [-30, 12, 60] as [number,number,number], target: [-10, 0, 40]  as [number,number,number] },
      { label: "Cruise",        pos: [0,  10, -40] as [number,number,number], target: [0,   0, -20] as [number,number,number] },
      { label: "Vue ensemble",  pos: [28, 14, 28]  as [number,number,number], target: [0,   0, -20] as [number,number,number] },
    ],
    train: [
      { label: "TGV",   pos: [0,  8, 22] as [number,number,number], target: [0, 1, 4]  as [number,number,number] },
      { label: "Plaza", pos: [14, 12, 18] as [number,number,number], target: [0, 2, 0]  as [number,number,number] },
    ],
  } as const;

  const applyPreset = (pos: [number,number,number], target: [number,number,number]) => {
    const ctrl = orbitRef.current;
    if (!ctrl) return;

    const nearPos: [number, number, number] = [
      target[0] + (pos[0] - target[0]) * 0.52,
      target[1] + (pos[1] - target[1]) * 0.52,
      target[2] + (pos[2] - target[2]) * 0.52,
    ];

    ctrl.object.position.set(...nearPos);
    ctrl.target.set(...target);
    ctrl.update();

    setTimeout(() => {
      const c = orbitRef.current;
      if (!c) return;
      c.object.position.set(...pos);
      c.target.set(...target);
      c.update();
    }, 420);

    setSpinBurst(true);
    if (spinRef.current) window.clearTimeout(spinRef.current);
    spinRef.current = window.setTimeout(() => setSpinBurst(false), 2200);

  };

  // Auto-tour cinématique: change d'élément toutes les 4s et applique le preset de caméra correspondant
  useEffect(() => {
    if (!autoElementTour || liveScene === "none") return;
    const elements = sceneMode === "ferry" ? FERRY_SELECTED_ELEMENTS : TRAIN_SELECTED_ELEMENTS;
    const presets = sceneMode === "ferry" ? CAMERA_PRESETS.ferry : CAMERA_PRESETS.train;
    tourRef.current = window.setInterval(() => {
      setTourStep((prev) => {
        const next = (prev + 1) % elements.length;
        if (sceneMode === "ferry") setActiveFerryElement(elements[next].id);
        else setActiveTrainElement(elements[next].id);
        const preset = presets[next % presets.length];
        setTimeout(() => applyPreset(preset.pos, preset.target), 120);
        return next;
      });
    }, 5600);
    return () => { if (tourRef.current) window.clearInterval(tourRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoElementTour, liveScene, sceneMode]);

  useEffect(() => {
    return () => {
      if (spinRef.current) window.clearTimeout(spinRef.current);
    };
  }, []);

  useEffect(() => {
    const activeId = sceneMode === "ferry" ? activeFerryElement : activeTrainElement;
    const key = `${sceneMode}-${activeId}`;
    elementButtonRefs.current[key]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sceneMode, activeFerryElement, activeTrainElement]);

  const activeClip = LOCAL_CLIPS[activeIndex] ?? LOCAL_CLIPS[0];

  useEffect(() => {
    if (!autoSlide) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % LOCAL_CLIPS.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [autoSlide]);

  useEffect(() => {
    setAccent(activeClip.vibe);
  }, [activeClip.vibe]);

  const rail = useMemo(() => [...LOCAL_CLIPS, ...LOCAL_CLIPS], []);
  const activeFerryCard = useMemo(
    () => FERRY_SELECTED_ELEMENTS.find((item) => item.id === activeFerryElement) ?? FERRY_SELECTED_ELEMENTS[0],
    [activeFerryElement],
  );
  const activeTrainCard = useMemo(
    () => TRAIN_SELECTED_ELEMENTS.find((item) => item.id === activeTrainElement) ?? TRAIN_SELECTED_ELEMENTS[0],
    [activeTrainElement],
  );
  const activeSceneCard = sceneMode === "ferry" ? activeFerryCard : activeTrainCard;
  const accentMeta = PANEL_STYLES[accent];
  const AccentIcon = accentMeta.icon;

  const goPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? LOCAL_CLIPS.length - 1 : prev - 1));
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % LOCAL_CLIPS.length);
  };

  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_15%,rgba(250,204,21,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.14),transparent_25%),linear-gradient(180deg,rgba(5,10,24,0.96),rgba(7,11,26,0.98))]" />
        <div className="container mx-auto px-4 lg:px-8 py-8 lg:py-10">
          <div className={cn("relative overflow-hidden rounded-[2rem] border border-white/12", accentMeta.glow)}>
            <video
              key={`hero-${activeClip.id}`}
              src={activeClip.src}
              poster={activeClip.poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="h-[280px] w-full object-cover sm:h-[340px] lg:h-[420px]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(2,6,23,0.84)_0%,rgba(2,6,23,0.28)_46%,rgba(2,6,23,0.9)_100%)]" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-[1.6rem] border border-white/12 bg-[rgba(255,255,255,0.03)] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-white/82">
                  <AccentIcon className="h-4 w-4" /> {accentMeta.label}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMuted((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white"
                  >
                    {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />} {muted ? "Audio Off" : "Audio On"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoSlide((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white"
                  >
                    <Play className="h-3.5 w-3.5" /> {autoSlide ? "Auto ON" : "Auto OFF"}
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/12 bg-black">
                <video
                  key={`main-${activeClip.id}-${muted ? "muted" : "sound"}`}
                  src={activeClip.src}
                  poster={activeClip.poster}
                  autoPlay
                  muted={muted}
                  loop
                  playsInline
                  preload="metadata"
                  className="aspect-video h-full w-full object-cover"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-black text-white sm:text-2xl">{activeClip.title}</h2>
                  <p className="text-sm text-white/68">{activeClip.note}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={goPrev} className="rounded-full border border-white/15 bg-white/5 p-2 text-white">
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={goNext} className="rounded-full border border-white/15 bg-white/5 p-2 text-white">
                    <SkipForward className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={cn("rounded-[1.6rem] border border-white/12 bg-gradient-to-br p-4", accentMeta.frame)}>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/75">Panneau Ambiance</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(["cinema", "concert", "night-city"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAccent(mode)}
                      className={cn(
                        "rounded-xl border px-2 py-2 text-xs font-semibold text-white transition",
                        accent === mode ? "border-white/40 bg-black/35" : "border-white/15 bg-black/20",
                      )}
                    >
                      {PANEL_STYLES[mode].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-white/12 bg-[rgba(255,255,255,0.03)] p-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/75">Bannière Locale Continue</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-white/12">
                  <video
                    src="/leaderboard-banner.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="h-[145px] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16">
        <div className="overflow-hidden rounded-[1.6rem] border border-white/15 bg-white/[0.08] p-4">
          <div className="overflow-x-auto pb-2">
            <div
              className="inline-flex min-w-max gap-4"
              style={{ animation: "lecteurRail 28s linear infinite" }}
            >
              {rail.map((clip, i) => (
                <button
                  key={`${clip.id}-${i}`}
                  type="button"
                  onClick={() => { setAutoSlide(false); setActiveIndex(i % LOCAL_CLIPS.length); }}
                  className={cn(
                    "group relative w-[240px] shrink-0 overflow-hidden rounded-[1.2rem] border text-left transition",
                    activeIndex === i % LOCAL_CLIPS.length
                      ? "border-amber-300/60 shadow-[0_0_28px_rgba(251,191,36,0.35)]"
                      : "border-white/12 hover:border-white/25",
                  )}
                >
                  <div className="relative aspect-video overflow-hidden rounded-t-[1.2rem] bg-neutral-900">
                    <img
                      src={clip.poster}
                      alt={clip.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = crystalCity.url;
                      }}
                      className="absolute inset-0 h-full w-full object-cover brightness-110 saturate-110 transition-transform duration-700 group-hover:scale-105"
                    />
                    <video
                      src={clip.src}
                      muted
                      loop
                      playsInline
                      preload="none"
                      onError={(e) => {
                        const video = e.currentTarget as HTMLVideoElement;
                        video.src = "/catalogue-banner.mp4";
                        video.load();
                      }}
                      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLVideoElement).pause(); }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur">
                      {clip.vibe}
                    </span>
                  </div>
                  <div className="bg-[rgba(255,255,255,0.04)] p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-white">{clip.title}</p>
                    <p className="mt-1 text-xs text-white/60">{clip.note}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-16">
        <div className="rounded-[1.8rem] border border-sky-200/60 bg-[linear-gradient(150deg,rgba(209,238,255,0.7),rgba(241,250,255,0.9))] p-4 sm:p-5 lg:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div />
            <div className="inline-flex rounded-full border border-sky-200/80 bg-white/70 p-1">
              <button
                type="button"
                onClick={() => setSceneMode("ferry")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  sceneMode === "ferry" ? "bg-cyan-300 text-slate-900" : "text-slate-600",
                )}
              >
                Ferry Pack
              </button>
              <button
                type="button"
                onClick={() => setSceneMode("train")}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  sceneMode === "train" ? "bg-amber-300 text-slate-900" : "text-slate-600",
                )}
              >
                Train Pack
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[1.2rem] border border-sky-200/60 bg-white/70">
                <video
                  key={`module-preview-${sceneMode}-${activeSceneCard.id}`}
                  src={activeSceneCard.previewSrc}
                  poster={activeSceneCard.previewPoster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="h-[260px] w-full object-cover"
                />
                <div className="border-t border-sky-200/60 bg-white/85 px-4 py-3 text-sm text-slate-700">
                  Élément sélectionné: <span className="font-black text-cyan-700">#{activeSceneCard.id}</span> {activeSceneCard.label}
                </div>
              </div>

              {liveScene !== "none" && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {(CAMERA_PRESETS[liveScene === "ferry" ? "ferry" : "train"]).map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.pos, p.target)}
                      className="rounded-full border border-sky-300/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-cyan-500/70 hover:bg-cyan-100 transition"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="overflow-hidden rounded-[1.2rem] border border-sky-200/60 bg-white/80">
                {liveScene === "none" ? (
                  <div className="flex h-[320px] items-center justify-center px-4 text-center text-sm text-slate-600">
                    Aperçu scène live désactivé.
                  </div>
                ) : (
                  <div className="h-[320px] w-full">
                    <Canvas
                      dpr={[1, 1.5]}
                      camera={liveScene === "ferry" ? { position: [28, 14, 28], fov: 58 } : { position: [0, 13, 20], fov: 52 }}
                      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
                      style={{ background: liveScene === "ferry" ? "#87ceeb" : "#b0d8f0" }}
                    >
                      {/* Sunny daylight rig */}
                      <ambientLight intensity={1.4} color="#fffbe8" />
                      <directionalLight position={[20, 35, 15]} intensity={2.2} color="#fff5cc" castShadow />
                      <directionalLight position={[-15, 18, -10]} intensity={0.9} color="#c8e8ff" />
                      <hemisphereLight args={["#aaddff", "#e8d9a8", 0.7]} />

                      {liveScene === "ferry" ? (
                        <FerryTrainCityPlaza
                          night={false}
                          isMobile
                          compactScene
                          position={[0, -1.7, -20]}
                          rotation={[0, -0.2, 0]}
                          scale={[0.2, 0.2, 0.2]}
                        />
                      ) : (
                        <group position={[0, -1.2, 0]} scale={[0.8, 0.8, 0.8]}>
                          <TrainStationReplicaWorld
                            isNight={false}
                            isMobile
                            compactScene
                            replicaLite
                            includeLocalLights={false}
                            onTrainHorn={null}
                          />
                        </group>
                      )}

                      <OrbitControls
                        ref={orbitRef}
                        enablePan
                        enableZoom
                        enableRotate
                        autoRotate={autoElementTour}
                        autoRotateSpeed={spinBurst ? 2.7 : 1.05}
                        minDistance={6}
                        maxDistance={liveScene === "ferry" ? 68 : 54}
                        maxPolarAngle={Math.PI * 0.48}
                        minPolarAngle={0.08}
                        target={liveScene === "ferry" ? [0, 0, -20] : [0, 2, 0]}
                        enableDamping
                        dampingFactor={0.08}
                        onStart={() => setAutoElementTour(false)}
                      />
                    </Canvas>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-sky-200/60 bg-white/75 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-600">
                {sceneMode === "ferry" ? "Éléments Ferry actifs" : "Éléments Train actifs"}
              </p>
              <div className="mt-3 grid max-h-[260px] gap-2 overflow-y-auto pr-1">
                {(sceneMode === "ferry" ? FERRY_SELECTED_ELEMENTS : TRAIN_SELECTED_ELEMENTS).map((item, idx) => {
                  const isActive = sceneMode === "ferry" ? activeFerryElement === item.id : activeTrainElement === item.id;
                  return (
                    <button
                      ref={(el) => {
                        elementButtonRefs.current[`${sceneMode}-${item.id}`] = el;
                      }}
                      key={`${sceneMode}-${item.id}`}
                      type="button"
                      onClick={() => {
                        setAutoElementTour(false);
                        if (tourRef.current) window.clearInterval(tourRef.current);
                        if (sceneMode === "ferry") setActiveFerryElement(item.id);
                        else setActiveTrainElement(item.id);
                        const presets = sceneMode === "ferry" ? CAMERA_PRESETS.ferry : CAMERA_PRESETS.train;
                        const preset = presets[idx % presets.length];
                        setTimeout(() => applyPreset(preset.pos, preset.target), 80);
                      }}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm transition",
                        isActive ? "border-cyan-500/60 bg-cyan-100 text-slate-900" : "border-sky-200/60 bg-white/70 text-slate-700",
                      )}
                    >
                      <span className="font-black text-cyan-700">#{item.id}</span> {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLiveScene("ferry")}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-semibold",
                      liveScene === "ferry" ? "border-cyan-500/60 bg-cyan-100 text-slate-900" : "border-sky-200/70 bg-white/65 text-slate-600",
                    )}
                  >
                    Live Ferry
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveScene("train")}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-semibold",
                      liveScene === "train" ? "border-amber-500/60 bg-amber-100 text-slate-900" : "border-sky-200/70 bg-white/65 text-slate-600",
                    )}
                  >
                    Live Train
                  </button>
                  <button
                    type="button"
                    onClick={() => setLiveScene("none")}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-semibold",
                      liveScene === "none" ? "border-slate-300 bg-slate-200/70 text-slate-800" : "border-sky-200/70 bg-white/65 text-slate-600",
                    )}
                  >
                    Pause Live
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoElementTour((v) => !v)}
                  className={cn(
                    "w-full rounded-lg border px-2 py-2 text-xs font-semibold transition",
                    autoElementTour ? "border-amber-500/60 bg-amber-100 text-amber-900" : "border-sky-200/70 bg-white/65 text-slate-600",
                  )}
                >
                  {autoElementTour ? "⏸ Tour auto actif" : "▶ Lancer tour auto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes lecteurRail {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </PageShell>
  );
}