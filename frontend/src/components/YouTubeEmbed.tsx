import { useEffect, useRef } from "react";
import { requestBestYouTubeQuality } from "@/lib/youtubeEmbed";

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeAPI(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(w.YT);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}

type Props = {
  videoId?: string;
  searchQuery?: string;
  onUnavailable?: () => void;
  onExhausted?: () => void;
  onPlayerReady?: (player: any | null) => void;
  onPlayerStateChange?: (state: number) => void;
  autoplay?: boolean;
  muted?: boolean;
  hideControls?: boolean;
  className?: string;
  title?: string;
  captionLang?: string; // when set, force captions in this language (e.g. "fr")
};

export default function YouTubeEmbed({
  videoId,
  searchQuery,
  onUnavailable,
  onExhausted,
  onPlayerReady,
  onPlayerStateChange,
  autoplay = true,
  muted = true,
  hideControls = true,
  className,
  title,
  captionLang,
}: Props) {
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const modeRef = useRef<"video" | "search">(videoId ? "video" : "search");
  const readyRef = useRef<boolean>(false);
  const callbacksRef = useRef({ onUnavailable, onExhausted, onPlayerReady, onPlayerStateChange });

  useEffect(() => {
    callbacksRef.current = { onUnavailable, onExhausted, onPlayerReady, onPlayerStateChange };
  }, [onExhausted, onPlayerReady, onPlayerStateChange, onUnavailable]);

  useEffect(() => {
    let disposed = false;
    let watchdog: any;

    modeRef.current = videoId ? "video" : "search";
    readyRef.current = false;

    loadYouTubeAPI().then((YT) => {
      if (disposed || !holderRef.current) return;
      holderRef.current.innerHTML = "";
      const mount = document.createElement("div");
      mount.className = "absolute inset-0 h-full w-full";
      holderRef.current.appendChild(mount);

      const commonVars: Record<string, any> = {
        autoplay: autoplay ? 1 : 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        origin: window.location.origin,
        hl: "fr",
        controls: hideControls ? 0 : 1,
        fs: hideControls ? 0 : 1,
        disablekb: hideControls ? 1 : 0,
        iv_load_policy: 3,
        cc_load_policy: captionLang ? 1 : 0,
        vq: "highres",
        ...(captionLang ? { cc_lang_pref: captionLang, hl: captionLang } : {}),
      };

      const opts: any = {
        width: "100%",
        height: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: commonVars,
        events: {
          onReady: () => {
            readyRef.current = true;
            clearTimeout(watchdog);
            try {
              if (muted) playerRef.current?.mute?.();
              else playerRef.current?.unMute?.();
              if (autoplay) playerRef.current?.playVideo?.();
              requestBestYouTubeQuality(playerRef.current);
              if (captionLang) {
                try {
                  playerRef.current?.setOption?.("captions", "reload", true);
                  playerRef.current?.setOption?.("captions", "track", { languageCode: captionLang });
                } catch {
                  // captions may not be available on this video
                }
              }
            } catch {
              // ignore autoplay sync errors
            }
            callbacksRef.current.onPlayerReady?.(playerRef.current);
          },
          onStateChange: (event: any) => {
            callbacksRef.current.onPlayerStateChange?.(event?.data);
          },
          onError: (event: any) => {
            const code = event?.data;
            if (!(code === 2 || code === 5 || code === 100 || code === 101 || code === 150)) return;
            if (modeRef.current === "video") {
              modeRef.current = "search";
              callbacksRef.current.onUnavailable?.();
              if (searchQuery && playerRef.current?.cuePlaylist) {
                try {
                  playerRef.current.cuePlaylist({ listType: "search", list: searchQuery, index: 0, startSeconds: 0 });
                  if (muted) playerRef.current?.mute?.();
                  else playerRef.current?.unMute?.();
                  if (autoplay) playerRef.current?.playVideo?.();
                  callbacksRef.current.onPlayerReady?.(playerRef.current);
                  return;
                } catch {
                  // fall through
                }
              }
              callbacksRef.current.onExhausted?.();
            } else {
              callbacksRef.current.onExhausted?.();
            }
          },
        },
      };

      if (videoId) {
        opts.videoId = videoId;
      } else if (searchQuery) {
        opts.playerVars = { ...commonVars, listType: "search", list: searchQuery };
      }

      playerRef.current = new YT.Player(mount, opts);

      if (videoId) {
        watchdog = setTimeout(() => {
          if (disposed || readyRef.current) return;
          if (modeRef.current === "video") {
            modeRef.current = "search";
            callbacksRef.current.onUnavailable?.();
            if (searchQuery) {
              try {
                playerRef.current?.cuePlaylist?.({ listType: "search", list: searchQuery, index: 0, startSeconds: 0 });
                if (muted) playerRef.current?.mute?.();
                else playerRef.current?.unMute?.();
                if (autoplay) playerRef.current?.playVideo?.();
                requestBestYouTubeQuality(playerRef.current);
                requestBestYouTubeQuality(playerRef.current);
                callbacksRef.current.onPlayerReady?.(playerRef.current);
                return;
              } catch {
                // ignore
              }
            }
            callbacksRef.current.onExhausted?.();
          }
        }, 9000);
      }
    });

    return () => {
      disposed = true;
      clearTimeout(watchdog);
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      callbacksRef.current.onPlayerReady?.(null);
    };
  }, [autoplay, hideControls, muted, searchQuery, title, videoId, captionLang]);

  return <div ref={holderRef} className={className ?? "absolute inset-0 h-full w-full"} aria-label={title} />;
}
