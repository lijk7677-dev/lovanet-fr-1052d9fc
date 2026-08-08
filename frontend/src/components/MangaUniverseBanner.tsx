import { Link } from "react-router-dom";
import { ArrowRight, Film, BookOpen, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import mangaBanner from "@/assets/manga-banner.jpg";
import { ResilientVideoFrame } from "@/components/ResilientVideoFrame";

type BgMode = "image" | "color" | "media" | "video";
const DEFAULT_MANGA_UNIVERSE_VIDEO = "/manga-universe-banner.mp4";

export const MangaUniverseBanner = ({ videoIds }: { videoIds?: string[] } = {}) => {
  const hasVideos = !!videoIds && videoIds.length > 0;
  const [bgMode, setBgMode] = useState<BgMode>("video");
  const [bgColor, setBgColor] = useState("#0b0b16");
  const [bgMedia, setBgMedia] = useState<string>("");
  const [mediaKind, setMediaKind] = useState<"image" | "video">("image");
  const [showPanel, setShowPanel] = useState(false);
  const [spots, setSpots] = useState<boolean[]>([true, true, true]);
  const [videoIdx, setVideoIdx] = useState(0);
  useEffect(() => {
    if (!hasVideos) return;
    // Rotate through the provided videos every ~14s for a lively banner.
    const id = window.setInterval(() => {
      setVideoIdx((i) => (i + 1) % (videoIds?.length || 1));
    }, 14000);
    return () => window.clearInterval(id);
  }, [hasVideos, videoIds?.length]);
  const toggleSpot = (i: number) =>
    setSpots((s) => s.map((v, idx) => (idx === i ? !v : v)));
  const onPickMedia = (file: File) => {
    const url = URL.createObjectURL(file);
    setBgMedia(url);
    setMediaKind(file.type.startsWith("video") ? "video" : "image");
    setBgMode("media");
  };

  const spotDefs = [
    { left: "18%", color: "255,80,220" },
    { left: "50%", color: "120,200,255" },
    { left: "82%", color: "255,220,120" },
  ];

  return (
    <section className="container mx-auto px-4 lg:px-8 pb-16">
      <div
        className="rgb-neon group relative block overflow-hidden rounded-3xl shadow-[0_40px_120px_-40px_hsl(var(--neon-magenta)/0.5)]"
        style={{ background: bgMode === "color" ? bgColor : undefined }}
      >
        {bgMode === "video" && (
          <div className="relative w-full h-56 sm:h-72 md:h-80 lg:h-96 overflow-hidden bg-black">
            {(hasVideos && videoIds?.length) ? (
              <ResilientVideoFrame
                videoId={videoIds![videoIdx]}
                title="Univers Manga & Anime — bannière animée"
                seed={`manga-banner-${videoIds![videoIdx]}`}
                searchQuery="anime moments officiel manga trailer"
                poster={mangaBanner}
                className="absolute inset-0 h-full w-full"
                fallbackBadge="Bannière de secours"
                fallbackDescription="Une vidéo de remplacement du site est utilisée pour garder la bannière active."
                dataTestId="manga-banner-resilient-frame"
              />
            ) : (
              <video
                src={DEFAULT_MANGA_UNIVERSE_VIDEO}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
                data-bg-video
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60" />
          </div>
        )}
        {bgMode === "image" && (
          <img
            src={mangaBanner}
            alt="Univers Manga & Anime"
            width={1920}
            height={640}
            loading="lazy"
            className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover"
          />
        )}
        {bgMode === "media" && bgMedia && (
          mediaKind === "video" ? (
            <video
              src={bgMedia}
              autoPlay
              loop
              muted
              playsInline
              data-bg-video
              className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover"
            />
          ) : (
            <img
              src={bgMedia}
              alt=""
              className="w-full h-56 sm:h-72 md:h-80 lg:h-96 object-cover"
            />
          )
        )}
        {bgMode === "color" && (
          <div className="w-full h-56 sm:h-72 md:h-80 lg:h-96" />
        )}

        {/* Interactive spotlights */}
        {spotDefs.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleSpot(i)}
            aria-label={`Spot ${i + 1} ${spots[i] ? "allumé" : "éteint"}`}
            className="absolute top-0 z-20"
            style={{ left: s.left, transform: "translateX(-50%)" }}
          >
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
            {spots[i] && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2"
                style={{
                  width: 260,
                  height: 280,
                  background: `radial-gradient(ellipse at top, rgba(${s.color},0.55) 0%, rgba(${s.color},0.15) 40%, transparent 70%)`,
                  clipPath: "polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)",
                  filter: "blur(2px)",
                }}
              />
            )}
          </button>
        ))}

        {/* Content overlay + CTA link */}
        <Link
          to="/chaine-youtube/manga"
          aria-label="Découvrir l'Univers Manga & Anime"
          className="absolute inset-0 flex flex-col md:flex-row items-center justify-between gap-4 p-6 sm:p-10 z-10 focus:outline-none focus:ring-4 focus:ring-primary/60 rounded-3xl"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div className="text-white">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/70 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Section dédiée
              </p>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                Univers Manga &amp; Anime
              </h2>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-white/70">
            <Film className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest">Image · Vidéo</span>
          </div>

          <span
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white shadow-lg transition-transform group-hover:translate-x-1"
            style={{ background: "var(--gradient-magenta)" }}
          >
            Entrer dans l'univers <ArrowRight className="w-4 h-4" />
          </span>
        </Link>

        {/* Background customization panel */}
        <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2">
          {showPanel && (
            <div className="rounded-xl bg-black/70 backdrop-blur border border-white/15 p-3 flex flex-col gap-2 text-white text-xs">
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
              <button
                type="button"
                onClick={() => { setBgMedia(""); setBgMode("image"); }}
                className="text-[10px] underline text-white/70 self-start"
              >
                Bannière par défaut
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowPanel((v) => !v)}
            className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur"
          >
            {showPanel ? "Fermer" : "Fond"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default MangaUniverseBanner;