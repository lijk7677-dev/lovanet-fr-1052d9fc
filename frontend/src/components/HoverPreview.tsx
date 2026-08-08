import { useEffect, useRef, useState, type ReactNode } from "react";
import { Ban, Play } from "lucide-react";
import { getVideoStatusSync } from "@/lib/videoAvailability";
import { siteFallbackImage } from "@/lib/mediaFallback";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";

type Props = {
  videoId: string;
  title: string;
  thumbnail: string;
  vertical?: boolean;
  aspectClass?: string;
  /** start muted (default true). When false, audio plays on hover. */
  muted?: boolean;
  /** delay before iframe loads on hover, in ms */
  delay?: number;
  /** Start playing automatically without waiting for hover (default true). */
  autoPlay?: boolean;
  /** extra overlays rendered above the player (badges, captions...) */
  children?: ReactNode;
  className?: string;
  onImgLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onImgError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
};

/**
 * Thumbnail that, on hover (or focus / touch), loads a muted YouTube iframe
 * playing the video in autoplay+loop — a TikTok-style mini preview.
 * The iframe is only inserted in the DOM while active, to keep the page light.
 */
export const HoverPreview = ({
  videoId,
  title,
  thumbnail,
  vertical,
  aspectClass,
  muted = true,
  delay = 0,
  autoPlay = false,
  children,
  className = "",
  onImgLoad,
  onImgError,
}: Props) => {
  const [active, setActive] = useState(autoPlay);
  const knownUnavailable = getVideoStatusSync(videoId);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (knownUnavailable && knownUnavailable !== "ok") {
      setActive(false);
      return;
    }
    if (autoPlay) setActive(true);
  }, [autoPlay, videoId, knownUnavailable]);

  const start = () => {
    if (knownUnavailable && knownUnavailable !== "ok") return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(true), delay);
  };
  const stop = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setActive(false);
  };

  const ratio = aspectClass || (vertical ? "aspect-[9/16]" : "aspect-video");
  const iframeWrap = vertical ? "absolute inset-0 overflow-hidden pointer-events-none" : "absolute inset-0 pointer-events-none";

  return (
    <div
      className={`rgb-frame relative overflow-hidden bg-white/95 ${ratio} ${className}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      onTouchStart={() => {
        if (knownUnavailable && knownUnavailable !== "ok") return;
        setActive((value) => !value);
      }}
    >
      <img
        src={knownUnavailable && knownUnavailable !== "ok" ? siteFallbackImage(videoId, thumbnail) : thumbnail}
        alt={title}
        loading="lazy"
        decoding="async"
        onLoad={onImgLoad}
        onError={onImgError}
        className={`w-full h-full object-cover transition-transform duration-500 ${active ? "scale-[1.02] opacity-0" : "opacity-100 group-hover:scale-[1.02]"}`}
      />

      {active && (
        <div className={iframeWrap}>
          {vertical ? (
            <iframe
              src={buildYouTubeEmbedUrl(videoId, { autoplay: true, muted, controls: false, loop: true, playlist: videoId, playsInline: true, nocookie: false })}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-[178%] border-0"
            />
          ) : (
            <iframe
              src={buildYouTubeEmbedUrl(videoId, { autoplay: true, muted, controls: false, loop: true, playlist: videoId, playsInline: true, nocookie: false })}
              title={title}
              allow="autoplay; encrypted-media; picture-in-picture"
              className="w-full h-full border-0"
            />
          )}
        </div>
      )}

      {!active && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.6)]">
            <Play className="w-6 h-6 text-primary-foreground fill-current" />
          </div>
        </div>
      )}

      {knownUnavailable && knownUnavailable !== "ok" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(circle_at_center,transparent_20%,rgba(5,10,24,0.6)_100%)] pointer-events-none">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-[rgba(8,12,24,0.68)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/88 shadow-lg">
            <Ban className="h-3.5 w-3.5" /> <span className="notranslate">Vidéo privée</span>
          </div>
        </div>
      )}

      {active && (
        <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-white text-[10px] font-bold uppercase tracking-wider pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Preview
        </span>
      )}

      {children}
    </div>
  );
};
