import React, { useMemo, useState } from "react";
import { siteFallbackVideo } from "@/lib/mediaFallback";

type VideoWithFallbackProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  src: string;
  seed?: string;
};

export default function VideoWithFallback({ src, seed, onError, ...props }: VideoWithFallbackProps) {
  const fallbacks = useMemo(() => {
    const list = [String(src)];
    try {
      const fb = siteFallbackVideo(seed || String(src));
      if (fb && fb !== list[0]) list.push(fb);
    } catch {}
    if (!list.includes("/banner-top.mp4")) list.push("/banner-top.mp4");
    return list;
  }, [src, seed]);

  const [index, setIndex] = useState(0);
  const current = fallbacks[index] || fallbacks[0];

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (onError) {
      try { onError(e); } catch {}
    }
    if (index < fallbacks.length - 1) {
      setIndex((i) => i + 1);
    }
  };

  return (
    <video
      {...props}
      src={current}
      onError={handleError}
    />
  );
}
