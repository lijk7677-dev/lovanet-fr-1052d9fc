import { X, Minimize2, Move } from "lucide-react";
import { usePiP } from "@/contexts/PiPContext";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";

export function GlobalPiPWidget() {
  const { videoId, closeVideo } = usePiP();
  const [position, setPosition] = useState({ x: 20, y: 80 }); // Default bottom-right (calculated from bottom)
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.initialX - dx, // Subtracted because x is from right
        y: dragRef.current.initialY - dy, // Subtracted because y is from bottom
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!videoId) return null;

  return (
    <div
      className={cn(
        "fixed z-[100] w-[320px] aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black animate-in fade-in zoom-in duration-300",
        isDragging && "opacity-90 cursor-move"
      )}
      style={{
        bottom: `${position.y}px`,
        right: `${position.x}px`,
      }}
    >
      <div 
        className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          setIsDragging(true);
          dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y };
        }}
      >
        <Move className="w-4 h-4 text-white/50" />
        <button onClick={closeVideo} className="text-white/70 hover:text-white p-1 bg-black/40 rounded-full">
          <X className="w-3 h-3" />
        </button>
      </div>
      <iframe
        src={buildYouTubeEmbedUrl(videoId, { autoplay: true, muted: false, controls: true, playsInline: true })}
        className="w-full h-full pointer-events-auto"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}
