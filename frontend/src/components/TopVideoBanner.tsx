import { useState } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";

type Video = { id: string; title?: string };

export default function TopVideoBanner({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState<string | null>(null);

  if (!videos || videos.length === 0) return null;

  return (
    <div
      className="w-full my-4"
      style={{
        position: "relative",
        zIndex: 30,
        pointerEvents: "auto",
      }}
    >
      <div
        className="mx-4 rounded-xl overflow-hidden"
        style={{
          background: "rgba(0,0,0,0.18)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex gap-3 items-center overflow-x-auto p-3">
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => setActive(v.id)}
              className="flex-none rounded-md overflow-hidden shadow-sm"
              style={{ width: 200 }}
              aria-label={`Ouvrir la vidéo ${v.title || v.id}`}
            >
              <div className="relative w-full h-28 bg-black">
                <img
                  src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                  alt={v.title || "video"}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.25))",
                  }}
                >
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5v14l11-7L8 5z" fill="white" opacity="0.95" />
                  </svg>
                </div>
              </div>
              <div className="px-3 py-2 text-xs text-left" style={{ color: "#fff" }}>
                <div className="font-bold truncate">{v.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setActive(null)}
        >
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-[90%] max-w-4xl aspect-video rounded-lg overflow-hidden">
            <iframe
              src={buildYouTubeEmbedUrl(active, { autoplay: true, muted: false, controls: true, playsInline: true })}
              title="Video player"
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
