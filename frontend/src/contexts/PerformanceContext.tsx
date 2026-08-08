import { createContext, useContext, useEffect, useState } from "react";

const VIDEO_PREF_KEY = "site_disable_videos";
const VIDEO_PREF_MANUAL_KEY = "site_disable_videos_manual";

interface PerformanceContextType {
  disableAnimations: boolean;
  disableVideos: boolean;
  toggleAnimations: () => void;
  toggleVideos: () => void;
  isMobile: boolean;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [disableAnimations, setDisableAnimations] = useState(false);
  const [disableVideos, setDisableVideos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1280;
      setIsMobile(mobile);
      return mobile;
    };
    
    const isMobileDevice = checkMobile();
    
    try {
      const savedAnimations = localStorage.getItem("site_disable_animations");
      const savedVideos = localStorage.getItem(VIDEO_PREF_KEY);
      const savedVideosManual = localStorage.getItem(VIDEO_PREF_MANUAL_KEY);
      
      // If no saved preference and is mobile/tablet, default to animations disabled
      if (savedAnimations === null && isMobileDevice) {
        setDisableAnimations(true);
      } else if (savedAnimations !== null) {
        setDisableAnimations(JSON.parse(savedAnimations));
      }
      
      // Only honor persisted video-hide if it was explicitly set by user toggle.
      if (savedVideos !== null && savedVideosManual === "1") {
        setDisableVideos(JSON.parse(savedVideos));
      } else {
        setDisableVideos(false);
        localStorage.setItem(VIDEO_PREF_KEY, JSON.stringify(false));
      }
    } catch {}

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // CSS class on <body> — survives React re-renders without DOM manipulation
  useEffect(() => {
    try { localStorage.setItem("site_disable_animations", JSON.stringify(disableAnimations)); } catch {}
    if (disableAnimations) {
      document.body.setAttribute("data-hide-decors", "1");
    } else {
      document.body.removeAttribute("data-hide-decors");
    }
  }, [disableAnimations]);

  useEffect(() => {
    try { localStorage.setItem(VIDEO_PREF_KEY, JSON.stringify(disableVideos)); } catch {}
    if (disableVideos) {
      document.body.setAttribute("data-hide-videos", "1");
    } else {
      document.body.removeAttribute("data-hide-videos");
      // Try to resume background/hero videos after they become visible again.
      window.requestAnimationFrame(() => {
        const nodes = document.querySelectorAll("video[data-bg-video], video.hero-banner-video");
        nodes.forEach((node) => {
          const video = node as HTMLVideoElement;
          video.muted = true;
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        });
      });
    }
  }, [disableVideos]);

  const toggleAnimations = () => setDisableAnimations((v) => !v);
  const toggleVideos = () => {
    try { localStorage.setItem(VIDEO_PREF_MANUAL_KEY, "1"); } catch {}
    setDisableVideos((v) => !v);
  };

  return (
    <PerformanceContext.Provider value={{ disableAnimations, disableVideos, toggleAnimations, toggleVideos, isMobile }}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error("usePerformance must be used within PerformanceProvider");
  }
  return context;
}
