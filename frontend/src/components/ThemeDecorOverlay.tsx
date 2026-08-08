import { CSSProperties, useEffect, useMemo, useState } from "react";
import { usePerformance } from "@/contexts/PerformanceContext";

const makeColor = (index: number) => {
  const colors = [
    "rgba(56,189,248,0.18)",
    "rgba(236,72,153,0.16)",
    "rgba(16,185,129,0.16)",
    "rgba(168,85,247,0.14)",
    "rgba(245,158,11,0.16)",
    "rgba(59,130,246,0.12)",
  ];
  return colors[index % colors.length];
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildActiveLayers = (ids: string[]) => {
  return ids.map((id, index) => {
    const hash = hashString(id + String(index));
    const type = ["blob", "ring", "beam", "grid", "flare", "orb"][hash % 6];
    const size = 96 + ((hash * 7) % 180);
    const left = 6 + (hash % 88);
    const top = 8 + ((hash * 5) % 84);
    const rotation = (hash % 360) - 180;
    const color = makeColor(index);
    const opacity = 0.14 + ((hash % 28) * 0.016);
    const velocity = 0.04 + ((hash % 26) * 0.002);
    return { id, type, left, top, size, rotation, color, opacity, velocity };
  });
};

const getActiveDecoratorIds = () => {
  if (typeof window === "undefined") return [] as string[];
  const bodyActive = (document.body.dataset.activeDecors || "").trim();
  if (bodyActive) {
    return bodyActive
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem("lovanet:decor-selection") || "[]");
    return Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export function ThemeDecorOverlay() {
  const { disableAnimations } = usePerformance();
  const [pointerX, setPointerX] = useState(50);
  const [pointerY, setPointerY] = useState(50);
  const [activeDecorIds, setActiveDecorIds] = useState<string[]>([]);

  useEffect(() => {
    setActiveDecorIds(getActiveDecoratorIds());
    const handleStorage = () => setActiveDecorIds(getActiveDecoratorIds());
    window.addEventListener("storage", handleStorage);
    window.addEventListener("lovanet:decor-update", handleStorage as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("lovanet:decor-update", handleStorage as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      setPointerX((event.clientX / window.innerWidth) * 100);
      setPointerY((event.clientY / window.innerHeight) * 100);
    };
    const handleTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      setPointerX((touch.clientX / window.innerWidth) * 100);
      setPointerY((touch.clientY / window.innerHeight) * 100);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleTouch);
    };
  }, []);

  const layers = useMemo(() => buildActiveLayers(activeDecorIds), [activeDecorIds]);
  if (disableAnimations || !activeDecorIds.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-3d-decor data-animated-bg style={{ opacity: 0.9, mixBlendMode: "screen" }}>
      {layers.map((layer) => {
        const offsetX = (pointerX - 50) * layer.velocity;
        const offsetY = (pointerY - 50) * layer.velocity;
        const shapeStyle: CSSProperties = {
          left: `${layer.left}%`,
          top: `${layer.top}%`,
          width: layer.size,
          height: layer.size,
          transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) translate(${offsetX}px, ${offsetY}px)`,
          opacity: layer.opacity,
          filter: "blur(5px)",
          pointerEvents: "none",
          position: "absolute",
        };

        switch (layer.type) {
          case "ring":
            return (
              <div
                key={`${layer.id}-ring`}
                className="pointer-events-none absolute rounded-full"
                data-3d-decor
                style={{
                  ...shapeStyle,
                  border: `1px solid ${layer.color}`,
                  background: "transparent",
                }}
              />
            );
          case "beam":
            return (
              <div
                key={`${layer.id}-beam`}
                className="pointer-events-none absolute rounded-full"
                data-3d-decor
                style={{
                  ...shapeStyle,
                  width: layer.size * 1.4,
                  height: layer.size * 0.25,
                  background: `linear-gradient(90deg, transparent 0%, ${layer.color} 35%, ${layer.color} 65%, transparent 100%)`,
                }}
              />
            );
          case "grid":
            return (
              <div
                key={`${layer.id}-grid`}
                className="pointer-events-none absolute"
                data-3d-decor
                style={{
                  ...shapeStyle,
                  backgroundImage: `linear-gradient(${layer.color}, ${layer.color}), linear-gradient(90deg, ${layer.color}, ${layer.color})`,
                  backgroundSize: "20px 20px",
                  backgroundBlendMode: "screen",
                  opacity: layer.opacity * 0.7,
                }}
              />
            );
          case "flare":
            return (
              <div
                key={`${layer.id}-flare`}
                className="pointer-events-none absolute rounded-full"
                data-3d-decor
                style={{
                  ...shapeStyle,
                  background: `radial-gradient(circle at 30% 30%, ${layer.color} 0%, transparent 55%)`,
                }}
              />
            );
          case "orb":
            return (
              <div
                key={`${layer.id}-orb`}
                className="pointer-events-none absolute rounded-full"
                data-3d-decor
                style={{
                  ...shapeStyle,
                  background: `radial-gradient(circle, ${layer.color} 0%, transparent 80%)`,
                }}
              />
            );
          default:
            return (
              <div
                key={`${layer.id}-blob`}
                className="pointer-events-none absolute rounded-full"
                data-3d-decor
                style={{
                  ...shapeStyle,
                  background: `radial-gradient(circle, ${layer.color} 0%, transparent 75%)`,
                }}
              />
            );
        }
      })}
    </div>
  );
}