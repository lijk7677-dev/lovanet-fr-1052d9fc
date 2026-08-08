import { useEffect, useMemo, useRef, useState } from "react";
import { IMPORTED_VIDEOS } from "@/data/importedVideos";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";

type Kind = "youtube" | "tiktok" | "mp4";

type Props = {
  kind: Kind;
  /** YouTube/TikTok IDs OR mp4 URLs. Cycled in order with auto-advance. */
  sources: string[];
  /** Auto-advance interval in ms (used for tiktok/mp4 fallback). */
  rotateMs?: number;
  className?: string;
  /** For tiktok, fetch latest TikTok IDs from imported_videos. */
  loadTiktokFromDB?: boolean;
};

export const MiniPreviewPlayer = ({
  kind,
  sources,
  rotateMs = 12000,
  className = "",
  loadTiktokFromDB,
}: Props) => {
  const [list, setList] = useState<string[]>(sources);
  const [i, setI] = useState(0);
  const [errored, setErrored] = useState(false);
  const errCountRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState<boolean>(
    typeof document === "undefined" ? true : !document.hidden
  );

  // Detect constrained devices: only render one preview at a time.
  const constrained = useMemo(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const small = window.innerWidth < 1024;
    const dm = (navigator as any).deviceMemory ?? 8;
    return coarse || small || dm < 4;
  }, []);

  // IntersectionObserver — only mount heavy iframe/video when visible.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setInView(e.isIntersecting);
      },
      { rootMargin: "100px", threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!loadTiktokFromDB) return;
    let cancelled = false;
    (async () => {
      const data = IMPORTED_VIDEOS.filter((v) => v.source === "tiktok").sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, 20);
      if (cancelled || !data?.length) return;
      const ids = data.map((r: any) => r.external_id).filter(Boolean);
      if (ids.length) setList(ids);
    })();
    return () => { cancelled = true; };
  }, [loadTiktokFromDB]);

  // Auto-rotate for every kind so we cycle reliably even on a single embed.
  useEffect(() => {
    if (list.length <= 1 || !inView || !tabVisible) return;
    const t = setInterval(() => setI((x) => (x + 1) % list.length), rotateMs);
    return () => clearInterval(t);
  }, [kind, list.length, rotateMs, inView, tabVisible]);

  useEffect(() => {
    setList(sources);
    setI(0);
    setErrored(false);
  }, [sources]);

  const active = inView && tabVisible;

  // Animated branded poster — shown while loading, off-screen, on error, or when list is empty.
  const poster = (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(var(--neon-magenta) / 0.45), transparent 60%), radial-gradient(circle at 70% 70%, hsl(var(--neon-cyan) / 0.45), transparent 60%), linear-gradient(135deg, #0b0b14, #1a1027)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white/80 text-[10px] tracking-[0.3em] uppercase animate-pulse">
          ● Lecture
        </span>
      </div>
    </div>
  );

  // Auto-skip to the next item if the current embed errors (blocked / copyright).
  // Only show the poster after we've cycled through everything once.
  const onEmbedError = () => {
    errCountRef.current += 1;
    if (errCountRef.current >= Math.max(1, list.length)) {
      setErrored(true);
      return;
    }
    setI((x) => (x + 1) % Math.max(1, list.length));
  };

  if (!list.length || errored) {
    return (
      <div ref={wrapRef} className={"w-full h-full " + className}>
        {poster}
      </div>
    );
  }

  if (kind === "youtube") {
    const current = list[i];
    // Single-video loop requires playlist=ID for the YouTube IFrame API.
    const src = buildYouTubeEmbedUrl(current, { autoplay: true, muted: true, controls: false, loop: true, playlist: current, playsInline: true });
    return (
      <div ref={wrapRef} className={"w-full h-full " + className}>
        {active ? (
          <iframe
            key={current}
            src={src}
            title="Mini preview"
            className="w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="lazy"
            onError={onEmbedError}
          />
        ) : poster}
      </div>
    );
  }

  if (kind === "tiktok") {
    const id = list[i];
    return (
      <div ref={wrapRef} className={"w-full h-full " + className}>
        {active ? (
          <iframe
            key={id}
            src={`https://www.tiktok.com/player/v1/${id}?autoplay=1&muted=1&controls=0&loop=1&rel=0&description=0&music_info=0`}
            title="TikTok preview"
            className="w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media"
            loading="lazy"
            onError={onEmbedError}
          />
        ) : poster}
      </div>
    );
  }

  // mp4
  const src = list[i];
  return (
    <div ref={wrapRef} className={"w-full h-full " + className}>
      {active ? (
        <video
          ref={videoRef}
          key={src}
          src={src}
          autoPlay
          muted
          loop={list.length === 1}
          playsInline
          preload={constrained ? "metadata" : "auto"}
          onEnded={() => setI((x) => (x + 1) % list.length)}
          onError={onEmbedError}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : poster}
    </div>
  );
};
