import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Compass, Film, Newspaper, Play, ShoppingBag, Star, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SEO_NEWS } from "@/data/seoNews";
import { PageShell } from "@/components/PageShell";
import { HoverPreview } from "@/components/HoverPreview";
import { createImageFallbackHandler, siteFallbackImage } from "@/lib/mediaFallback";
import { hydrateYouTubeAvailability } from "@/lib/youtubeAvailability";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePortalAudio } from "@/hooks/usePortalAudio";
import { FloatingCardsDeco } from "@/components/BreakoutDecorations";
import { motion } from "framer-motion";

const rotatingPortalDestinations = [
  { to: "/anime-moments", label: "Anime Moments", icon: Film },
  { to: "/decouvrir", label: "Univers Lovanet", icon: Compass },
  { to: "/actualites", label: "Actualités", icon: Newspaper },
  { to: "/shop", label: "Boutique", icon: ShoppingBag },
  { to: "/prime-video", label: "Prime Vidéo", icon: Play },
  { to: "/tiktok", label: "TikTok", icon: Play },
  { to: "/anime-catalog", label: "Catalogue", icon: Star },
  { to: "/anime-countdown", label: "À venir", icon: Play },
  { to: "/lecteurs-video", label: "Lecteurs vidéo", icon: Film },
  { to: "/contact", label: "Contact", icon: Newspaper },
];


const portalCards = [
  {
    title: "Boutique premium",
    subtitle: "",
    description: "Sélection produits, drops et pièces mises à jour en continu.",
    image: "",
    video: "",
    testId: "home-portal-card-1",
    to: "/shop",
  },
  {
    title: "Prime & vidéos",
    subtitle: "",
    description: "Lecture premium, extraits et navigation multi-plateforme.",
    image: "",
    video: "",
    testId: "home-portal-card-2",
    to: "/prime-video",
  },
];

const platformCards = [
  { title: "Prime Vidéo", testId: "home-platform-card-prime", to: "/prime-video" },
  { title: "", testId: "home-platform-card-tiktok", to: "/tiktok" },
  { title: "Catalogue", testId: "home-platform-card-catalogue", to: "/anime-catalog" },
  { title: "À venir", testId: "home-platform-card-upcoming", to: "/anime-countdown" },
];




const shuffleArray = (list) => {
  const clone = [...list];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
};

const featuredNews = SEO_NEWS.slice(0, 3).map((item, index) => ({
  ...item,
  href: item.category === "product" ? "/shop" : item.sourcePath || "/actualites",
  testId: `home-news-card-${index + 1}`,
}));

const pageStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Lovanet : portail anime manga officiel",
  description: "Portail Lovanet pour explorer Anime Moments, les vidéos, les actualités et la boutique collector.",
  url: "https://lovanet.fr/",
};

const luxurySection =
  "relative overflow-hidden rounded-[2.25rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] backdrop-blur-2xl shadow-[0_24px_90px_-28px_hsl(var(--neon-magenta)/0.32),0_0_0_1px_rgba(255,255,255,0.05)_inset]";
const luxuryCard =
  "group relative overflow-hidden rounded-[1.9rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-2xl shadow-[0_18px_60px_-24px_hsl(var(--neon-magenta)/0.26)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_22px_78px_-24px_hsl(var(--neon-cyan)/0.36)]";
const luxuryGlowLeft =
  "pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-fuchsia-400/18 blur-3xl";
const luxuryGlowRight =
  "pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-cyan-400/18 blur-3xl";
const secondaryButton =
  "rounded-full border border-white/20 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_12px_32px_-18px_rgba(0,0,0,0.55)] backdrop-blur-xl hover:border-white/35 hover:bg-white/[0.12] hover:shadow-[0_16px_36px_-18px_rgba(90,220,255,0.45)]";
const luxuryIcon =
  "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] text-white";
const portalRotationIntervalMs = 10000;
const catalogRotationIntervalMs = 12000;
const catalogBatchSize = 12;
const catalogRowSize = 6;
// Home banners: index 0 -> Hero, index 1 -> Portal card 1, index 2 -> Portal card 2.
const DEFAULT_HOME_BANNERS = [
  { id: "b1", src: "/custom-hero-banner-web.mp4", label: "Bannière hero (haut)" },
  { id: "b2", src: "", label: "Carte du haut" },
  { id: "b3", src: "", label: "Carte Prime & vidéos (bas)" },
];
const BANNER_STATE_KEY = "lovanet.home.banners.v2";
const BANNER_SLOT_LABELS = ["Emplacement 1 · Hero", "Emplacement 2 · Carte", "Emplacement 3 · Carte"];

const loadHomeBanners = () => {
  const byId = Object.fromEntries(DEFAULT_HOME_BANNERS.map((b) => [b.id, b]));
  try {
    const saved = JSON.parse(localStorage.getItem(BANNER_STATE_KEY) || "null");
    if (
      Array.isArray(saved) &&
      saved.length === DEFAULT_HOME_BANNERS.length &&
      saved.every((s) => s && byId[s.id])
    ) {
      return saved.map((s) => ({ ...byId[s.id], visible: s.visible !== false }));
    }
  } catch (e) {
    /* ignore */
  }
  return DEFAULT_HOME_BANNERS.map((b) => ({ ...b, visible: true }));
};


const getPortalDestination = (slotIndex, rotationIndex) =>
  rotatingPortalDestinations[(slotIndex + rotationIndex) % rotatingPortalDestinations.length];

export default function RootLandingPage() {
  const [rotationIndex, setRotationIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [catalogPreviewPool, setCatalogPreviewPool] = useState([]);
  const [catalogRotationIndex, setCatalogRotationIndex] = useState(0);
  const bannerVideoRef = useRef(null);
  const bannerShellRef = useRef(null);
  const portalAudio = usePortalAudio({ storageKey: "lovanet.portal.audio.enabled" });

  const [homeBanners, setHomeBanners] = useState(loadHomeBanners);
  const dragIndexRef = useRef(null);

  const heroBanner = homeBanners[0];
  const cardBanners = [homeBanners[1], homeBanners[2]];

  const persistBanners = (next) => {
    setHomeBanners(next);
    try {
      localStorage.setItem(
        BANNER_STATE_KEY,
        JSON.stringify(next.map((b) => ({ id: b.id, visible: b.visible !== false })))
      );
    } catch (e) {
      /* ignore */
    }
  };
  const handleBannerDragStart = (i) => {
    dragIndexRef.current = i;
  };
  const handleBannerDrop = (i) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === i) return;
    const next = [...homeBanners];
    const [moved] = next.splice(from, 1);
    next.splice(i, 0, moved);
    persistBanners(next);
  };
  const toggleBannerVisible = (id) => {
    persistBanners(
      homeBanners.map((b) => (b.id === id ? { ...b, visible: !(b.visible !== false) } : b))
    );
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setRotationIndex((value) => (value + 1) % rotatingPortalDestinations.length);
    }, portalRotationIntervalMs);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/catalog-seo.json")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const normalized = shuffleArray(
          data
            .filter((item) => item?.cover && item?.title && String(item?.trailerId || "").trim())
            .map((item, index) => ({
              id: String(item.id || `catalog-${index}`),
              title: item.title,
              image: item.cover || item.banner || siteFallbackImage(String(item.id || index), null),
              trailerId: String(item.trailerId || "").trim(),
              genres: Array.isArray(item.genres) ? item.genres.slice(0, 3) : [],
              href: `/anime-catalog?anime=${item.id}`,
              year: item.seasonYear || item.year || "Catalogue",
            })),
        );
        setCatalogPreviewPool(normalized);
        console.log("Loaded catalog previews:", normalized.length);
        
        // Mock availability check to avoid 404
        normalized.slice(0, 36).forEach(item => {
          if (item.trailerId) {
             import('@/lib/videoAvailability').then(({setVideoStatus}) => {
                setVideoStatus(item.trailerId, "ok");
             });
          }
        });
      })
      .catch(() => {
        if (!cancelled) setCatalogPreviewPool([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (catalogPreviewPool.length <= catalogBatchSize) return undefined;
    const id = window.setInterval(() => {
      setCatalogRotationIndex((current) => (current + catalogBatchSize) % catalogPreviewPool.length);
    }, catalogRotationIntervalMs);
    return () => window.clearInterval(id);
  }, [catalogPreviewPool.length]);

  useEffect(() => {
    const video = bannerVideoRef.current;
    if (!video) return;

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }, [heroBanner?.id, heroBanner?.visible]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => setReducedMotion(media.matches);
    syncReduced();
    media.addEventListener?.("change", syncReduced);

    const shell = bannerShellRef.current;
    if (!shell || media.matches) {
      return () => media.removeEventListener?.("change", syncReduced);
    }

    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;
    let drift = 0;
    let running = true;

    const update = () => {
      if (!running) return;
      drift += 0.018;
      const droneX = Math.sin(drift) * 10;
      const droneY = Math.cos(drift * 0.75) * 8;
      const tiltX = (-pointerY * 7) + Math.cos(drift * 0.6) * 2.5;
      const tiltY = (pointerX * 10) + Math.sin(drift * 0.9) * 3;
      shell.style.setProperty("--banner-rotate-x", `${tiltX.toFixed(2)}deg`);
      shell.style.setProperty("--banner-rotate-y", `${tiltY.toFixed(2)}deg`);
      shell.style.setProperty("--banner-shift-x", `${droneX.toFixed(2)}px`);
      shell.style.setProperty("--banner-shift-y", `${droneY.toFixed(2)}px`);
      shell.style.setProperty("--banner-glow-x", `${50 + pointerX * 18}%`);
      shell.style.setProperty("--banner-glow-y", `${42 + pointerY * 16}%`);
      frame = window.requestAnimationFrame(update);
    };

    const onPointerMove = (event) => {
      const rect = shell.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointerX = (x - 0.5) * 2;
      pointerY = (y - 0.5) * 2;
    };

    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };

    shell.addEventListener("pointermove", onPointerMove);
    shell.addEventListener("pointerleave", onPointerLeave);
    frame = window.requestAnimationFrame(update);

    return () => {
      running = false;
      shell.removeEventListener("pointermove", onPointerMove);
      shell.removeEventListener("pointerleave", onPointerLeave);
      window.cancelAnimationFrame(frame);
      media.removeEventListener?.("change", syncReduced);
    };
  }, []);

  const heroPrimary = useMemo(() => getPortalDestination(0, rotationIndex), [rotationIndex]);
  const heroSecondary = useMemo(() => getPortalDestination(1, rotationIndex), [rotationIndex]);
  const heroNews = useMemo(() => getPortalDestination(2, rotationIndex), [rotationIndex]);
  const portalEntries = useMemo(() => portalCards.map((card, index) => ({ ...card, action: getPortalDestination(index, rotationIndex) })), [rotationIndex]);
  const platformEntries = useMemo(
    () =>
      platformCards.map((card) => ({
        ...card,
        action: rotatingPortalDestinations.find((entry) => entry.to === card.to) || { to: card.to, label: card.title, icon: Play },
      })),
    [],
  );
  const activeCatalogCards = useMemo(() => {
    if (!catalogPreviewPool.length) return [];
    if (catalogPreviewPool.length <= catalogBatchSize) return catalogPreviewPool;
    return Array.from({ length: catalogBatchSize }, (_, index) => catalogPreviewPool[(catalogRotationIndex + index) % catalogPreviewPool.length]);
  }, [catalogPreviewPool, catalogRotationIndex]);
  const catalogPreviewRows = useMemo(
    () => Array.from({ length: 2 }, (_, rowIndex) => activeCatalogCards.slice(rowIndex * catalogRowSize, rowIndex * catalogRowSize + catalogRowSize)),
    [activeCatalogCards],
  );

  return (
    <PageShell>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageStructuredData)}</script>
      </Helmet>

      <div className="relative overflow-hidden" data-testid="root-landing-page">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42rem] bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_20%)]" />

        <section className="mx-auto w-[95%] md:w-[50%] lg:w-[45%] px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-24 lg:pt-20">
          <div className={`${luxurySection} p-2 sm:p-3 lg:p-4`}>
            <div className={luxuryGlowLeft} />
            <div className={luxuryGlowRight} />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_35%,transparent_65%,rgba(255,255,255,0.03))]" />
            <div
              ref={bannerShellRef}
              className="hero-banner-3d relative overflow-hidden rounded-[1.25rem] min-h-[350px] sm:min-h-[440px] lg:min-h-[480px] w-full"
              data-testid="root-landing-hero-banner-shell"
            >
              {heroBanner && heroBanner.visible !== false ? (
                <video
                  ref={bannerVideoRef}
                  className="hero-banner-video absolute inset-0 h-full w-full object-cover object-center"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  decoding="async"
                  fetchPriority="high"
                  disablePictureInPicture
                  data-testid="hero-banner-background-video"
                  data-bg-video
                  poster="/custom-hero-banner-poster.jpg"
                >
                  <source src="/custom-hero-banner-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
                  <source src={heroBanner.src} type="video/mp4" />
                </video>
              ) : (
                <div
                  className="absolute inset-0 h-full w-full bg-cover bg-center bg-black/80"
                  data-testid="hero-banner-hidden-placeholder"
                />
              )}
              <div className="hero-banner-darken pointer-events-none absolute inset-0" />
              <div className="hero-banner-specular pointer-events-none absolute inset-0" />
              <div className="hero-banner-color-bloom pointer-events-none absolute inset-0" />

              <div className="hero-banner-content relative flex min-h-[350px] sm:min-h-[440px] lg:min-h-[480px] flex-col justify-end p-4 sm:p-6 lg:p-8 z-30 pointer-events-none">
                <div className="flex flex-row flex-wrap gap-2 pointer-events-auto" data-testid="hero-banner-bottom-primary-buttons">
                  <Button asChild size="sm" className="btn-neon-rainbow h-8 rounded-full px-4 text-[10px] sm:text-xs font-semibold text-white/90 backdrop-blur-md border border-white/20 bg-black/30 hover:bg-black/40" data-testid="home-hero-primary-cta-button">
                    <Link to={heroPrimary.to}>
                      <span key={`hero-primary-${heroPrimary.to}-${rotationIndex}`} className="inline-flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-500">
                        {heroPrimary.label}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  </Button>
                  <Button asChild variant="glass" size="sm" className={`h-8 rounded-full px-4 text-[10px] sm:text-xs font-semibold text-white/90 bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/10`} data-testid="home-hero-secondary-cta-button">
                    <Link to={heroSecondary.to}>
                      <span key={`hero-secondary-${heroSecondary.to}-${rotationIndex}`} className="inline-flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-500">
                        {heroSecondary.label}
                        <Compass className="h-3 w-3 text-cyan-300" />
                      </span>
                    </Link>
                  </Button>
                </div>

                <div className="mt-2 flex flex-row flex-wrap gap-2 pointer-events-auto" data-testid="home-hero-highlights-grid">
                  {[heroPrimary, heroSecondary, heroNews].map((item, index) => (
                    <Link key={`hero-highlight-${index}-${item.to}`} to={item.to} className="flex items-center justify-center h-7 px-3 rounded-full border border-white/10 bg-black/20 hover:bg-black/30 backdrop-blur-md text-[9px] sm:text-[10px] font-medium text-white/80 transition-colors" data-testid={`home-hero-highlight-link-${index + 1}`}>
                      <span key={`hero-highlight-label-${index}-${item.to}-${rotationIndex}`} className="animate-in fade-in zoom-in-95 duration-500">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>



        <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12 relative" data-testid="home-platforms-section">
          <div className={`${luxurySection} home-platforms-neutral-shell p-4 sm:p-6 lg:p-8 relative overflow-hidden ring-1 ring-white/10 z-20`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,14,26,0.1)_0%,rgba(6,14,26,0.85)_100%)]" />
            <div className="relative">
              <div className="relative mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="h-10 w-36 rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_24px_rgba(34,211,238,0.1)] backdrop-blur-md" data-testid="home-platforms-heading-placeholder" />
                <Button asChild variant="glass" size="sm" className="h-10 rounded-full px-4 text-xs font-semibold text-white/90 backdrop-blur-md border border-white/20 bg-black/30 hover:bg-black/40" data-testid="home-platforms-button">
                  <Link to="/anime-catalog">
                    <span className="inline-flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-500">
                      Catalogue premium
                      <ArrowRight className="h-3.5 w-3.5 neon-rgb-icon" />
                    </span>
                  </Link>
                </Button>
              </div>


              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="home-platforms-pill-row">
                {platformEntries.map((card, index) => {
                  const Icon = card.action.icon;
                  return (
                    <Link key={`${card.testId}-${card.to}-${index}`} to={card.to} className="group block min-w-0" data-testid={card.testId}>
                      <div className="group relative overflow-hidden rounded-full border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] backdrop-blur-md p-2 sm:p-2.5 flex items-center gap-2.5 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/30 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(34,211,238,0.3)]">
                        <motion.div 
                          whileHover={{ rotateY: 180, rotateZ: 10, scale: 1.2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 10 }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/40"
                          style={{ perspective: "500px", transformStyle: "preserve-3d" }}
                        >
                          <Icon className="h-3.5 w-3.5 text-white/80 group-hover:text-fuchsia-300 transition-colors drop-shadow-[0_0_5px_currentColor]" />
                        </motion.div>
                        {card.title && <p className="text-[11px] sm:text-xs font-semibold text-white/90 truncate">{card.title}</p>}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {catalogPreviewRows.some((row) => row.length > 0) && (
                <div className="hero-premium-lower-marquee mt-6" data-testid="home-platforms-dynamic-banner-grid">
                  {catalogPreviewRows.map((row, rowIndex) => (
                    <div key={`catalog-row-${rowIndex}`} className="hero-premium-lower-row">
                      <div className={`hero-premium-lower-track ${rowIndex % 2 === 1 ? "hero-premium-lower-track-reverse" : ""}`}>
                        {[...row, ...row].map((item, index) => (
                          <Link
                            key={`${item.id}-${rowIndex}-${index}`}
                            to={item.href}
                            className="hero-premium-lower-card group flex w-[132px] min-w-[132px] max-w-[132px] flex-none flex-col sm:w-[148px] sm:min-w-[148px] sm:max-w-[148px] lg:w-[176px] lg:min-w-[176px] lg:max-w-[176px] xl:w-[196px] xl:min-w-[196px] xl:max-w-[196px]"
                            data-testid={`home-platforms-dynamic-card-${rowIndex + 1}-${index + 1}`}
                          >
                            <div className="hero-premium-lower-thumb-shell hero-premium-lower-thumb-shell-vertical aspect-[3/4] w-full overflow-hidden">
                              <HoverPreview
                                videoId={item.trailerId}
                                title={item.title}
                                thumbnail={item.image}
                                vertical
                                delay={120}
                                className="h-full w-full"
                                onImgError={createImageFallbackHandler(item.id, item.image)}
                              >
                                <div className="hero-premium-lower-thumb-overlay" />
                                <div className="hero-premium-lower-badge">bande-annonce</div>
                                <div className="absolute inset-x-0 bottom-0 z-10 p-3">
                                  <div className="rounded-2xl border border-white/12 bg-[rgba(4,10,22,0.48)] px-3 py-2 backdrop-blur-xl">
                                    <p className="line-clamp-1 text-[10px] uppercase tracking-[0.2em] text-white/60">{item.year}</p>
                                    <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                                  </div>
                                </div>
                              </HoverPreview>
                            </div>
                            <div className="hero-premium-lower-copy">
                              <p className="hero-premium-lower-title">{item.title}</p>
                              <p className="hero-premium-lower-description">{item.genres.join(" • ") || "Catalogue premium"}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

      </div>
    </PageShell>
  );
}
