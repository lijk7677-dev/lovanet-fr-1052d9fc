import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";
import { Helmet } from "react-helmet-async";
import { useGamification } from "@/contexts/GamificationContext";
import { Link, useParams } from "react-router-dom";
import { usePiP } from "@/contexts/PiPContext";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  ExternalLink,
  Flame,
  Globe,
  LayoutGrid,
  Newspaper,
  Radar,
  RefreshCcw,
  Search,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

const PRIMARY_SITE = "https://lovanet.fr";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAGE_SIZE = 24;

const ACTUALITES_BANNER_VIDEO = "https://drive.google.com/uc?export=download&id=1Rf2nvttvwP8pLXhgT5pU8vFkPwkwy92N";

const CATEGORY_CONFIG: Record<string, { label: string; eyebrow: string; accent: string; glow: string }> = {
  anime: { label: "Anime Pulse", eyebrow: "Anime", accent: "var(--theme-neon-a)", glow: "rgba(56,189,248,0.24)" },
  manga: { label: "Manga Motion", eyebrow: "Manga", accent: "var(--theme-neon-b)", glow: "rgba(244,114,182,0.22)" },
  gaming: { label: "Gaming Reactor", eyebrow: "Gaming", accent: "#f59e0b", glow: "rgba(245,158,11,0.24)" },
  "pop-culture": { label: "Pop Culture JP", eyebrow: "Culture pop japonaise", accent: "#34d399", glow: "rgba(52,211,153,0.24)" },
};

type NewsItem = {
  id?: string;
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  content?: string;
  image?: string | null;
  published_at?: string;
  source_name?: string;
  source_group?: string;
  source_id?: string;
  source_path?: string;
  source_domain?: string;
  author?: string;
  categories?: string[];
  categoryLabels?: string[];
  tags?: string[];
  is_breaking?: boolean;
  is_featured?: boolean;
  trending_score?: number;
  embed_video?: string;
  verified?: boolean;
  anime_ref?: {
    id?: number;
    score?: number;
    year?: number;
    status?: string;
    cover?: string;
    banner?: string;
    nextEpisode?: number;
    nextAiringAt?: string;
  };
};

type NewsSource = {
  id: string;
  name: string;
  source_group: string;
  categories?: string[];
  priority?: number;
  status?: string;
  last_success_at?: string;
  last_count?: number;
  last_error?: string | null;
  site_url?: string;
  language?: string;
  region?: string;
};

type NewsHomePayload = {
  hero: NewsItem[];
  featured: NewsItem[];
  latest: NewsItem[];
  rails: Record<string, NewsItem[]>;
  trending: NewsItem[];
  calendar: NewsItem[];
  sources: NewsSource[];
  updated_at?: string;
};

type NewsListingPayload = {
  items: NewsItem[];
  total: number;
  offset: number;
  limit: number;
  source: string;
  categories: { id: string; label: string }[];
};

type NewsDetailPayload = {
  item: NewsItem;
  related: NewsItem[];
  source: string;
};

function displayImage(image?: string | null) {
  if (!image) return "/lovanet-og.svg";
  if (image.startsWith("http")) return `${API}/news/image-proxy?url=${encodeURIComponent(image)}`;
  return image;
}

function seoImage(image?: string | null) {
  if (!image) return `${PRIMARY_SITE}/lovanet-og.svg`;
  if (image.startsWith("http")) return `${PRIMARY_SITE}/api/news/image-proxy?url=${encodeURIComponent(image)}`;
  return `${PRIMARY_SITE}${image.startsWith("/") ? image : `/${image}`}`;
}

function stripHtml(value?: string) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value?: string) {
  if (!value) return "Mise à jour en cours";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Mise à jour en cours";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function relativeTime(value?: string) {
  if (!value) return "Flux récent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Flux récent";
  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(diffMs / 3600000);
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  return rtf.format(Math.round(diffHours / 24), "day");
}

function categoryTheme(category?: string) {
  return CATEGORY_CONFIG[category || "anime"] || CATEGORY_CONFIG.anime;
}

function articleParagraphs(item?: NewsItem) {
  const source = stripHtml(item?.content || item?.excerpt || item?.description || "");
  const sentences = source.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 3) return [source || "Article en cours d’agrégation depuis la source éditoriale."];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(" "));
  }
  return paragraphs;
}

function buildAutoReaderItems(home: NewsHomePayload | null, listing: NewsListingPayload | null) {
  const pool = [
    ...(home?.latest || []),
    ...(home?.trending || []),
    ...(listing?.items || []),
  ];
  const unique = new Map<string, NewsItem>();
  pool.forEach((item) => {
    if (item.slug && !unique.has(item.slug)) unique.set(item.slug, item);
  });
  // Return ALL unique articles for full rotation cycle instead of limiting to 9
  return Array.from(unique.values());
}

const LANGUAGE_OPTIONS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === "fr" || !text) return text;
  try {
    const response = await fetch(`${API}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: [text], target_lang: targetLanguage }),
    });
    if (!response.ok) throw new Error(`Translate error: ${response.status}`);
    const data = await response.json();
    const translations = data.translations || [];
    return (translations[0]?.translated_text || text);
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
}

function formatArticleReadStatus(item?: NewsItem) {
  const sourceLabel = item?.source_group || item?.source_name || "Source premium";
  const published = formatDate(item?.published_at);
  return `${sourceLabel} · ${published}`;
}

function AutoArticleViewer({ items }: { items: NewsItem[] }) {
  const [readerIndex, setReaderIndex] = useState(0);
  const [countdown, setCountdown] = useState(19);
  const [isPaused, setIsPaused] = useState(false);
  const [translationLang, setTranslationLang] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<{ title: string; description: string; paragraphs: string[] } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const item = items[readerIndex] || items[0];
  const paragraphs = useMemo(() => articleParagraphs(item), [item]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    // Clear translation when article changes
    setTranslationLang(null);
    setTranslatedContent(null);
  }, [item]);

  const handleTranslate = async (lang: string) => {
    if (lang === translationLang) {
      setTranslationLang(null);
      setTranslatedContent(null);
      return;
    }
    setIsTranslating(true);
    try {
      const [translatedTitle, translatedDesc, ...translatedParagraphs] = await Promise.all([
        translateText(item.title, lang),
        translateText(stripHtml(item.description || item.excerpt || item.content).slice(0, 180), lang),
        ...paragraphs.map((p) => translateText(p, lang)),
      ]);
      setTranslatedContent({
        title: translatedTitle,
        description: translatedDesc,
        paragraphs: translatedParagraphs,
      });
      setTranslationLang(lang);
    } catch (err) {
      console.error("Translation error:", err);
      toast.error("Traduction échouée", { description: "Impossible de traduire le contenu pour le moment." });
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (!items.length || isPaused) return undefined;
    setCountdown(19);
    const interval = window.setInterval(() => {
      setCountdown((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    const timeout = window.setTimeout(() => {
      setReaderIndex((index) => (index + 1) % items.length);
    }, 19000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [readerIndex, items.length, isPaused]);

  if (!items.length) return null;

  const displayTitle = translatedContent?.title || item.title;
  const displayDescription = translatedContent?.description || stripHtml(item.description || item.excerpt || item.content).slice(0, 180);
  const displayParagraphs = translatedContent?.paragraphs || paragraphs;

  return (
    <section className="grid gap-6 xl:grid-cols-[0.45fr_0.55fr]" data-testid="actualites-auto-reader">
      <div className="theme-panel-surface rounded-[2rem] border border-[var(--theme-border-soft)] overflow-hidden bg-black/25 shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${item.slug}-visual`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative aspect-[4/3] overflow-hidden bg-slate-950"
          >
            {item.embed_video ? (
              <iframe
                src={buildYouTubeEmbedUrl(item.embed_video, { autoplay: true, muted: true, controls: false, loop: true, playlist: item.embed_video, playsInline: true })}
                title={item.title}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              />
            ) : (
              <img src={displayImage(item.image)} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.16),transparent_32%)]" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="theme-panel-surface rounded-[2rem] border border-[var(--theme-border-soft)] bg-[rgba(5,10,24,0.82)] p-5 sm:p-6 shadow-[0_24px_90px_rgba(0,0,0,0.3)] flex flex-col">
        <motion.div
          key={`${item.slug}-content`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex-1 flex flex-col gap-4"
        >
          <div className="pb-4 border-b border-white/10">
            <p className="text-sm font-semibold tracking-[0.02em] text-white">{displayTitle}</p>
            <p className="mt-2 text-xs text-white/50">{formatArticleReadStatus(item)}</p>
            {translationLang && <p className="mt-1 text-xs text-sky-300">{LANGUAGE_OPTIONS.find((l) => l.code === translationLang)?.label}</p>}
          </div>

          <div
            ref={containerRef}
            className="flex-1 space-y-4 overflow-y-auto pr-2 text-sm leading-7 text-white/80 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/15"
          >
            <motion.p
              className="text-white/80"
              initial={{ opacity: 0.5, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {displayDescription}
            </motion.p>
            {displayParagraphs.map((paragraph, index) => (
              <motion.p
                key={`${item.slug}-paragraph-${index}`}
                className="text-sm leading-7 text-white/80"
                initial={{ opacity: 0.5, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2 flex-wrap">
                {items.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    type="button"
                    onClick={() => { setReaderIndex(index); setIsPaused(true); }}
                    className={`h-2 rounded-full transition-all ${index === readerIndex ? "w-6 bg-sky-400" : "w-2 bg-white/20 hover:bg-white/40"}`}
                    aria-label={`Aller à l'article ${index + 1}`}
                  />
                ))}
              </div>
              <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/75">
                {countdown}s
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleTranslate(lang.code)}
                  disabled={isTranslating}
                  className={`text-[11px] px-2 py-1 rounded-full transition-all border ${
                    translationLang === lang.code
                      ? "border-sky-400 bg-sky-400/20 text-sky-200"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function collectionJsonLd(items: NewsItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Actualités premium Lovanet",
    description: "Flux premium anime, manga, gaming et culture pop japonaise alimentés par de vraies sources publiques.",
    url: `${PRIMARY_SITE}/actualites`,
    hasPart: items.slice(0, 18).map((item) => ({
      "@type": "NewsArticle",
      headline: item.title,
      description: item.description || item.excerpt,
      image: [seoImage(item.image)],
      datePublished: item.published_at,
      url: `${PRIMARY_SITE}/actualites/${item.slug}`,
      author: { "@type": "Organization", name: item.source_name || item.author || "Lovanet" },
      publisher: { "@type": "Organization", name: "Lovanet", logo: { "@type": "ImageObject", url: `${PRIMARY_SITE}/lovanet-logo-custom.png` } },
    })),
  };
}

function articleJsonLd(item: NewsItem) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: item.title,
    description: item.description || item.excerpt,
    image: [seoImage(item.image)],
    datePublished: item.published_at,
    dateModified: item.published_at,
    url: `${PRIMARY_SITE}/actualites/${item.slug}`,
    mainEntityOfPage: `${PRIMARY_SITE}/actualites/${item.slug}`,
    author: { "@type": "Organization", name: item.source_name || item.author || "Lovanet" },
    publisher: {
      "@type": "Organization",
      name: "Lovanet",
      logo: { "@type": "ImageObject", url: `${PRIMARY_SITE}/lovanet-logo-custom.png` },
    },
    articleSection: item.categoryLabels?.join(", ") || item.categories?.join(", "),
    keywords: item.tags?.join(", ") || "actualités anime, manga, gaming, pop culture japonaise",
  };
}

function ArticleBadge({ item }: { item: NewsItem }) {
  const primaryCategory = item.categories?.[0] || "anime";
  const theme = categoryTheme(primaryCategory);
  return (
    <div className="flex flex-wrap gap-2" data-testid={`news-card-badges-${item.slug}`}>
      <Badge className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/90 backdrop-blur-xl">
        {theme.eyebrow}
      </Badge>
      <Badge variant="outline" className="rounded-full border-[var(--theme-border-soft)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-white/80">
        {item.source_group || item.source_name || "Source éditoriale"}
      </Badge>
      {item.verified && (
        <Badge variant="outline" className="rounded-full border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
          <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Vérifiée
        </Badge>
      )}
    </div>
  );
}

function NewsCard({ item, priority = false, testId }: { item: NewsItem; priority?: boolean; testId: string }) {
  const theme = categoryTheme(item.categories?.[0]);
  const { playVideo } = usePiP();
  const { incrementQuest, unlockAchievement } = useGamification();

  return (
    <Link to={`/actualites/${item.slug}`} data-testid={testId} className="group block h-full break-inside-avoid">
      <Card
        className="theme-panel-surface hover-lift h-full overflow-hidden rounded-[1.7rem] border border-[var(--theme-border-soft)] bg-transparent text-left transition-[transform,border-color,box-shadow] duration-300"
        style={{ boxShadow: `0 18px 54px -34px ${theme.glow}, var(--theme-glow-2)` }}
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          {item.embed_video ? (
            <div className="absolute inset-0 w-full h-full">
              <iframe
                src={buildYouTubeEmbedUrl(item.embed_video, { autoplay: true, muted: true, controls: false, loop: true, playlist: item.embed_video, playsInline: true })}
                className="absolute inset-0 w-[120%] h-[120%] -left-[10%] -top-[10%] pointer-events-none"
                style={{ objectFit: "cover" }}
                frameBorder="0"
                allow="autoplay; encrypted-media"
              />
            </div>
          ) : (
            <img
              src={displayImage(item.image)}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading={priority ? "eager" : "lazy"}
            />
          )}
          <img
            src={displayImage(item.image)}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading={priority ? "eager" : "lazy"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(5,10,24,0.96)] via-[rgba(5,10,24,0.28)] to-transparent" />
          <div className="absolute left-4 top-4 right-4 flex items-start justify-between gap-3 z-10 pointer-events-none">
            <ArticleBadge item={item} />
            {item.is_breaking && (
              <span className="inline-flex min-h-[36px] items-center rounded-full border border-white/20 bg-[rgba(8,10,18,0.44)] px-3 text-xs font-semibold text-white/90 backdrop-blur-xl" data-testid={`news-breaking-badge-${item.slug}`}>
                <Flame className="mr-1.5 h-3.5 w-3.5 text-amber-300" /> Pulse
              </span>
            )}
          </div>
          {item.embed_video && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                playVideo(item.embed_video!);
                incrementQuest("watch_trailer");
                unlockAchievement("watch_trailer");
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 hover:scale-110 transition-all backdrop-blur-md opacity-0 group-hover:opacity-100"
              title="Lire en Picture-in-Picture"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(7,12,24,0.52)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDate(item.published_at)}
            </div>
          </div>
        </div>
        <CardContent className="space-y-3 p-5">
          <h3 className="font-display text-xl font-black leading-tight text-white transition-colors group-hover:text-[var(--theme-link-hover)]">
            {item.title}
          </h3>
          <p className="line-clamp-3 text-sm leading-7 text-white/72">
            {stripHtml(item.description || item.excerpt || item.content).slice(0, 220)}
          </p>
          <div className="flex items-center justify-between gap-3 text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5 ml-auto">
              Lire la fiche <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NewsRail({ category, items }: { category: string; items: NewsItem[] }) {
  const theme = categoryTheme(category);
  if (!items?.length) return null;

  return (
    <section className="space-y-5" data-testid={`news-rail-${category}`}>
      <div
        className="relative overflow-hidden rounded-[1.8rem] border border-[var(--theme-border-soft)] px-4 py-5 sm:px-6 theme-panel-surface"
        style={{ background: `linear-gradient(135deg, ${theme.glow} 0%, rgba(255,255,255,0.03) 52%, rgba(255,255,255,0.01) 100%)` }}
      >
        <div className="absolute inset-y-0 right-0 w-56 opacity-45" style={{ background: `radial-gradient(circle at center, ${theme.glow} 0%, transparent 68%)` }} />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/58">{theme.eyebrow}</p>
            <h2 className="mt-2 font-display text-2xl font-black text-white">{theme.label}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/68">
              Sélection éditoriale mise à jour automatiquement pour cette thématique.
            </p>
          </div>
          <Button asChild variant="glass" className="rounded-full border-white/20 text-white" data-testid={`news-rail-more-${category}`}>
            <Link to={`/actualites?category=${category}`}>Explorer la section <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <Carousel opts={{ align: "start", loop: false }} className="mobile-rail-peek w-full" data-testid={`news-rail-carousel-${category}`}>
        <CarouselContent className="-ml-4">
          {items.map((item) => (
            <CarouselItem key={`${category}-${item.slug}`} className="basis-[88%] pl-4 sm:basis-[70%] md:basis-1/2 xl:basis-1/3">
              <NewsCard item={item} testId={`news-rail-card-${category}-${item.slug}`} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 top-[42%] hidden border-white/20 bg-[rgba(8,12,24,0.74)] text-white hover:bg-[rgba(8,12,24,0.94)] sm:inline-flex" />
        <CarouselNext className="right-2 top-[42%] hidden border-white/20 bg-[rgba(8,12,24,0.74)] text-white hover:bg-[rgba(8,12,24,0.94)] sm:inline-flex" />
      </Carousel>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <section className="container mx-auto space-y-6 px-4 py-10 lg:px-8" data-testid="actualites-loading-state">
      <Skeleton className="h-[320px] rounded-[2rem] bg-white/10" />
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-[420px] rounded-[2rem] bg-white/10" />
        <div className="space-y-5">
          <Skeleton className="h-[200px] rounded-[2rem] bg-white/10" />
          <Skeleton className="h-[200px] rounded-[2rem] bg-white/10" />
        </div>
      </div>
    </section>
  );
}

export default function Actualites() {
  const { slug } = useParams();
  const [home, setHome] = useState<NewsHomePayload | null>(null);
  const [listing, setListing] = useState<NewsListingPayload | null>(null);
  const [detail, setDetail] = useState<NewsDetailPayload | null>(null);
  const [detailTranslationLang, setDetailTranslationLang] = useState<string | null>(null);
  const [detailTranslatedContent, setDetailTranslatedContent] = useState<{ title: string; description: string; paragraphs: string[] } | null>(null);
  const [isDetailTranslating, setIsDetailTranslating] = useState(false);
  const { incrementQuest, unlockAchievement } = useGamification();
  
  // Also hook into detail rendering for reading quests
  useEffect(() => {
    if (detail?.item) {
      incrementQuest("read_news");
    }
  }, [detail?.item, incrementQuest]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("trending");
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug, page]);

  useEffect(() => {
    if (slug) return;
    setPage(1);
  }, [category, source, sort]);

  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: number | undefined;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        if (slug) {
          const detailData: NewsDetailPayload = await fetch(`${API}/news/${slug}`, { signal: controller.signal }).then((res) => {
            if (!res.ok) throw new Error(`detail-${res.status}`);
            return res.json();
          });
          setDetail(detailData);
          setHome(null);
          setListing(null);
        } else {
          const query = new URLSearchParams({
            limit: String(PAGE_SIZE),
            offset: String((page - 1) * PAGE_SIZE),
            sort,
          });
          if (category !== "all") query.set("category", category);
          if (source !== "all") query.set("source", source);
          if (search.trim()) query.set("q", search.trim());

          const [homeData, listingData]: [NewsHomePayload, NewsListingPayload] = await Promise.all([
            fetch(`${API}/news/home`, { signal: controller.signal }).then((res) => {
              if (!res.ok) throw new Error(`home-${res.status}`);
              return res.json();
            }),
            fetch(`${API}/news?${query.toString()}`, { signal: controller.signal }).then((res) => {
              if (!res.ok) throw new Error(`listing-${res.status}`);
              return res.json();
            }),
          ]);
          setHome(homeData);
          setListing(listingData);
          setDetail(null);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Actualités fetch error", err);
        setError("Impossible de charger les actualités premium pour le moment.");
      } finally {
        setLoading(false);
      }
    };

    if (!slug && search.trim()) {
      timeoutId = window.setTimeout(run, 260);
    } else {
      run();
    }

    return () => {
      controller.abort();
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [slug, page, search, category, source, sort]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const response = await fetch(`${API}/sync/news`, { method: "POST" });
      if (!response.ok) throw new Error(`sync-${response.status}`);
      const result = await response.json();
      toast.success("Flux premium actualisés", {
        description: `${result.count || 0} éléments ré-ingérés depuis les vraies sources`,
      });
      if (slug) {
        const refreshed = await fetch(`${API}/news/${slug}`).then((res) => res.json());
        setDetail(refreshed);
      } else {
        const [homeData, listingData]: [NewsHomePayload, NewsListingPayload] = await Promise.all([
          fetch(`${API}/news/home`).then((res) => res.json()),
          fetch(`${API}/news?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}&sort=${sort}${category !== "all" ? `&category=${category}` : ""}${source !== "all" ? `&source=${source}` : ""}${search.trim() ? `&q=${encodeURIComponent(search.trim())}` : ""}`).then((res) => res.json()),
        ]);
        setHome(homeData);
        setListing(listingData);
      }
    } catch (err) {
      console.error(err);
      toast.error("La synchronisation des flux a échoué", {
        description: "Les sources restent visibles, mais la mise à jour immédiate n’a pas pu se terminer.",
      });
    } finally {
      setSyncing(false);

    }
  };

  const handleDetailTranslate = async (lang: string) => {
    if (!detail?.item) return;
    if (lang === detailTranslationLang) {
      setDetailTranslationLang(null);
      setDetailTranslatedContent(null);
      return;
    }
    setIsDetailTranslating(true);
    try {
      const paragraphs = articleParagraphs(detail.item);
      const [translatedTitle, translatedDesc, ...translatedParagraphs] = await Promise.all([
        translateText(detail.item.title, lang),
        translateText(stripHtml(detail.item.description || detail.item.excerpt || detail.item.content).slice(0, 260), lang),
        ...paragraphs.map((p) => translateText(p, lang)),
      ]);
      setDetailTranslatedContent({
        title: translatedTitle,
        description: translatedDesc,
        paragraphs: translatedParagraphs,
      });
      setDetailTranslationLang(lang);
    } catch (err) {
      console.error("Detail translation error:", err);
      toast.error("Traduction échouée", { description: "Impossible de traduire le détail de l'article." });
    } finally {
      setIsDetailTranslating(false);
    }
  };

  useEffect(() => {
    if (slug && detail?.item) {
      setDetailTranslationLang(null);
      setDetailTranslatedContent(null);
    }
  }, [slug, detail?.item]);

  const pageTitle = detail?.item
    ? `${detail.item.title} — Actualités premium Lovanet`
    : "Actualités premium anime, manga, gaming et pop culture — Lovanet";

  const pageDescription = detail?.item
    ? stripHtml(detail.item.description || detail.item.excerpt || detail.item.content).slice(0, 180)
    : "Vraies actualités premium issues de sources publiques anime, manga, gaming et culture pop japonaise, agrégées automatiquement par Lovanet.";

  const canonical = detail?.item ? `${PRIMARY_SITE}/actualites/${detail.item.slug}` : `${PRIMARY_SITE}/actualites`;
  const detailParagraphs = useMemo(() => articleParagraphs(detail?.item), [detail]);
  const topHero = home?.hero?.[0];
  const sideHero = home?.hero?.slice(1, 3) || [];
  const heroPool = useMemo(() => (home?.hero || []).slice(0, 6), [home]);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (heroPool.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroPool.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroPool.length]);
  const rotatingHero = heroPool[heroIndex] || topHero;
  const rotatingSideHero = useMemo(() => {
    if (heroPool.length < 3) return sideHero;
    const start = (heroIndex + 1) % heroPool.length;
    return [heroPool[start], heroPool[(start + 1) % heroPool.length]].filter(Boolean);
  }, [heroPool, heroIndex, sideHero]);
  const autoReaderItems = useMemo(() => buildAutoReaderItems(home, listing), [home, listing]);
  const totalPages = listing ? Math.max(1, Math.ceil((listing.total || 0) / PAGE_SIZE)) : 1;
  const sourceOptions = home?.sources || [];
  const categoryOptions = listing?.categories || [
    { id: "anime", label: "Anime" },
    { id: "manga", label: "Manga" },
    { id: "gaming", label: "Gaming" },
    { id: "pop-culture", label: "Pop-culture JP" },
  ];
  const collectionLd = !detail?.item && (home?.featured?.length || listing?.items?.length)
    ? collectionJsonLd([...(home?.featured || []), ...(listing?.items || [])])
    : null;

  if (loading) {
    return (
      <PageShell>
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" key="actualites-description" content={pageDescription} />
          <link rel="canonical" key="actualites-canonical" href={canonical} />
        </Helmet>
        <LoadingSkeleton />
      </PageShell>
    );
  }

  if (detail?.item) {
    const item = detail.item;
    const displayTitle = detailTranslatedContent?.title || item.title;
    const displayDescription = detailTranslatedContent?.description || stripHtml(item.description || item.excerpt || item.content).slice(0, 260);
    const displayParagraphs = detailTranslatedContent?.paragraphs || detailParagraphs;
    return (
      <PageShell>
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" key="actualites-description" content={pageDescription} />
          <meta name="robots" content="index,follow,max-image-preview:large,max-video-preview:-1,max-snippet:-1" />
          <link rel="canonical" key="actualites-canonical" href={canonical} />
          <meta property="og:type" content="article" />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDescription} />
          <meta property="og:url" content={canonical} />
          <meta property="og:image" content={seoImage(item.image)} />
          <script type="application/ld+json">{JSON.stringify(articleJsonLd(item))}</script>
        </Helmet>

        <section className="container mx-auto space-y-8 px-4 py-10 lg:px-8" data-testid="actualites-detail-page">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="glass" className="rounded-full text-white" data-testid="actualites-back-button">
              <Link to="/actualites">Retour aux actualités</Link>
            </Button>
            <Button type="button" variant="outline" className="rounded-full text-white" onClick={handleSync} data-testid="actualites-detail-sync-button">
              <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Mettre à jour les flux
            </Button>
          </div>

          <header className="theme-panel-surface relative overflow-hidden rounded-[2rem] border border-[var(--theme-border-soft)] p-6 sm:p-8 lg:p-10" data-testid="actualites-detail-hero">
            <div className="absolute inset-0 opacity-70" style={{ background: `linear-gradient(135deg, ${categoryTheme(item.categories?.[0]).glow} 0%, transparent 60%)` }} />
            <div className="relative grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <ArticleBadge item={item} />
                </div>
                <h1 className="font-display text-3xl font-black leading-tight text-white md:text-4xl xl:text-5xl" data-testid="actualites-detail-title">
                  {displayTitle}
                </h1>
                {detailTranslationLang && <p className="text-xs text-sky-300">{LANGUAGE_OPTIONS.find((l) => l.code === detailTranslationLang)?.label}</p>}
                <p className="max-w-3xl text-base leading-8 text-white/76" data-testid="actualites-detail-description">
                  {displayDescription}
                </p>
                <div className="flex flex-wrap gap-3 text-sm text-white/64">
                  <span className="theme-glass-chip rounded-full px-4 py-2" data-testid="actualites-detail-date">{formatDate(item.published_at)}</span>
                  <span className="theme-glass-chip rounded-full px-4 py-2" data-testid="actualites-detail-source">{item.source_name || item.source_group || "Source premium"}</span>
                  <span className="theme-glass-chip rounded-full px-4 py-2" data-testid="actualites-detail-relative">{relativeTime(item.published_at)}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleDetailTranslate(lang.code)}
                      disabled={isDetailTranslating}
                      className={`text-[11px] px-2 py-1 rounded-full transition-all border ${
                        detailTranslationLang === lang.code
                          ? "border-sky-400 bg-sky-400/20 text-sky-200"
                          : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.04]">
                <img src={displayImage(item.image)} alt={item.title} className="h-full min-h-[320px] w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(6,10,22,0.9)] via-transparent to-transparent" />
              </div>
            </div>
          </header>

          <div className="grid gap-8 xl:grid-cols-[1.06fr_.42fr]">
            <article className="theme-panel-surface rounded-[2rem] border border-[var(--theme-border-soft)] p-6 sm:p-8" data-testid="actualites-detail-article">
              <div className="grid gap-6 md:grid-cols-1">
                <Card className="theme-subpanel border-none bg-transparent text-white" data-testid="actualites-detail-tags-card">
                  <CardContent className="p-5">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Mots-clés</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(item.tags || []).slice(0, 8).map((tag) => (
                        <span key={tag} className="theme-mini-chip">#{tag}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8 space-y-5">
                {displayParagraphs.map((paragraph, index) => (
                  <p key={`${item.slug}-paragraph-${index}`} className="text-base leading-8 text-white/78" data-testid={`actualites-detail-paragraph-${index + 1}`}>
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="btn-neon-rainbow rounded-full text-white" data-testid="actualites-detail-source-link">
                  <a href={item.source_path || PRIMARY_SITE} target="_blank" rel="noopener noreferrer">
                    Lire la source originale <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="glass" className="rounded-full text-white" data-testid="actualites-detail-back-link">
                  <Link to="/actualites">Retour aux actualités</Link>
                </Button>
              </div>
            </article>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" data-testid="actualites-detail-sidebar">
              <Card className="theme-panel-surface rounded-[1.8rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-detail-source-widget">
                <CardContent className="space-y-4 p-6">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">Widget source</p>
                  <div>
                    <h2 className="font-display text-2xl font-black">{item.source_name || item.source_group}</h2>
                    <p className="mt-2 text-sm text-white/66">{item.source_domain || "source éditoriale publique"}</p>
                  </div>
                  <div className="space-y-2 text-sm text-white/72">
                    <div className="flex items-center justify-between"><span>Publication</span><span>{formatDate(item.published_at)}</span></div>
                    <div className="flex items-center justify-between"><span>Fraîcheur</span><span>{relativeTime(item.published_at)}</span></div>
                    <div className="flex items-center justify-between"><span>Statut</span><span>{item.verified ? "Vérifiée" : "Publique"}</span></div>
                  </div>
                </CardContent>
              </Card>

              {!!detail.related?.length && (
                <Card className="theme-panel-surface rounded-[1.8rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-detail-related-widget">
                  <CardContent className="space-y-4 p-6">
                    <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">Liés à ce flux</p>
                    <div className="space-y-3">
                      {detail.related.slice(0, 5).map((related) => (
                        <Link key={related.slug} to={`/actualites/${related.slug}`} className="theme-subpanel block rounded-[1.2rem] border-none bg-transparent p-4 hover-lift" data-testid={`actualites-detail-related-link-${related.slug}`}>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">{related.source_group || related.source_name}</p>
                          <p className="mt-2 line-clamp-2 text-sm font-semibold text-white/88">{related.title}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>

          {!!detail.related?.length && (
            <section className="space-y-5" data-testid="actualites-detail-related-rail">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">Lecture associée</p>
                <h2 className="mt-2 font-display text-3xl font-black text-white">À lire ensuite</h2>
              </div>
              <Carousel opts={{ align: "start" }} className="w-full">
                <CarouselContent className="-ml-4">
                  {detail.related.map((related) => (
                    <CarouselItem key={`detail-related-${related.slug}`} className="pl-4 md:basis-1/2 xl:basis-1/3">
                      <NewsCard item={related} testId={`actualites-detail-carousel-card-${related.slug}`} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 top-[42%] border-white/20 bg-[rgba(8,12,24,0.74)] text-white hover:bg-[rgba(8,12,24,0.94)]" />
                <CarouselNext className="right-2 top-[42%] border-white/20 bg-[rgba(8,12,24,0.74)] text-white hover:bg-[rgba(8,12,24,0.94)]" />
              </Carousel>
            </section>
          )}
        </section>
      </PageShell>
    );
  }

  if (error || !home || !listing || !topHero) {
    return (
      <PageShell>
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" key="actualites-description" content={pageDescription} />
          <link rel="canonical" key="actualites-canonical" href={canonical} />
        </Helmet>
        <section className="container mx-auto px-4 py-12 lg:px-8" data-testid="actualites-error-state">
          <Card className="theme-panel-surface rounded-[2rem] border border-[var(--theme-border-soft)] bg-transparent text-white">
            <CardContent className="space-y-4 p-8">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/52">Actualités</p>
              <h1 className="font-display text-3xl font-black">Flux indisponible temporairement</h1>
              <p className="max-w-2xl text-white/70">{error || "Le chargement des actualités réelles a échoué. Réessayez ou relancez une synchronisation des flux."}</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSync} className="btn-neon-rainbow rounded-full text-white" data-testid="actualites-retry-sync-button">
                  <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Réessayer la synchronisation
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" key="actualites-description" content={pageDescription} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-video-preview:-1,max-snippet:-1" />
        <meta name="news_keywords" content="anime, manga, gaming, pop culture japonaise, actualités premium" />
        <link rel="canonical" key="actualites-canonical" href={canonical} />
        <link rel="alternate" type="application/rss+xml" href={`${PRIMARY_SITE}/rss.xml`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={seoImage(topHero.image)} />
        {collectionLd && <script type="application/ld+json">{JSON.stringify(collectionLd)}</script>}
      </Helmet>

      <section className="container mx-auto space-y-6 px-4 py-8 sm:space-y-8 sm:py-10 lg:px-8" data-testid="actualites-page">
        <header className="theme-panel-surface relative overflow-hidden rounded-[2rem] border border-[var(--theme-border-soft)] p-5 sm:p-7 lg:p-9" data-testid="actualites-premium-hero">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(244,114,182,0.16),transparent_24%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,0.16),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_42%)]" />
          <div className="relative grid gap-5 xl:grid-cols-[1.1fr_.9fr] xl:items-stretch">
            <div className="space-y-4 sm:space-y-5">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_15px_80px_rgba(0,0,0,0.15)] backdrop-blur-xl">
                <video
                  src="/actualites-banner.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  data-bg-video
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="relative grid gap-5 lg:grid-cols-[0.72fr_1fr] xl:grid-cols-[0.72fr_1fr] p-5 sm:p-6">
                  <div className="flex flex-col justify-end rounded-[1.8rem] border border-white/10 bg-[rgba(0,0,0,0.32)] p-4" style={{ minHeight: 460 }} />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/46">Anime · Manga · Gaming · Pop-culture JP</p>
                    <h1 className="mt-3 max-w-4xl font-display text-3xl font-black leading-[1.02] text-white sm:text-4xl md:text-5xl xl:text-6xl" data-testid="actualites-page-title">
                      Actualités anime, manga.
                    </h1>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <Button type="button" onClick={handleSync} className="btn-neon-rainbow rounded-full text-white" data-testid="actualites-sync-button">
                        <RefreshCcw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> Actualiser les flux
                      </Button>
                      <Button asChild variant="glass" className="rounded-full text-white" data-testid="actualites-scroll-trending-button">
                        <a href="#actualites-trending">Voir les tendances</a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-rows-[1fr_1fr]">
              <NewsCard item={rotatingHero || topHero} priority testId={`actualites-hero-card-${(rotatingHero || topHero).slug}`} />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {(rotatingSideHero.length ? rotatingSideHero : sideHero).map((item) => (
                  <NewsCard key={item.slug} item={item} testId={`actualites-side-hero-card-${item.slug}`} />
                ))}
              </div>
              {heroPool.length > 1 && (
                <div className="flex items-center justify-center gap-2 pt-1" data-testid="actualites-hero-dots">
                  {heroPool.map((_, idx) => (
                    <button
                      key={`hero-dot-${idx}`}
                      type="button"
                      onClick={() => setHeroIndex(idx)}
                      aria-label={`Aller à la bannière ${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${idx === heroIndex ? "w-8 bg-[var(--theme-link)]" : "w-2.5 bg-white/25 hover:bg-white/50"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {autoReaderItems.length > 0 && <AutoArticleViewer items={autoReaderItems} />}

        <section className="theme-panel-surface overflow-hidden rounded-[1.7rem] border border-[var(--theme-border-soft)] bg-transparent px-4 py-4 sm:px-5" data-testid="actualites-live-ticker">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="marquee-viewport relative flex-1 overflow-hidden">
              <div className="marquee-track gap-3 [--marquee-duration:44s]">
                {[...home.latest.slice(0, 8), ...home.latest.slice(0, 8)].map((item, index) => (
                  <Link
                    key={`${item.slug}-${index}`}
                    to={`/actualites/${item.slug}`}
                    className="inline-flex min-h-[42px] items-center gap-3 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white/74 backdrop-blur-xl transition-colors hover:text-white"
                    data-testid={`actualites-live-chip-${item.slug}-${index}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--theme-link)] shadow-[0_0_18px_var(--theme-link)]" />
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_.4fr]" id="actualites-trending">
          <div className="space-y-6">
            <Card className="theme-panel-surface rounded-[1.8rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-filter-panel">
              <CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1.2fr_.7fr_.7fr_.7fr_auto] md:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/44" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Chercher un sujet, une licence, un studio, une sortie..."
                    className="theme-search-input h-12 rounded-2xl pl-10 text-white placeholder:text-white/40"
                    data-testid="actualites-search-input"
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="theme-search-input h-12 rounded-2xl text-white" data-testid="actualites-category-select">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent className="theme-panel-surface border-[var(--theme-border-soft)] bg-[rgba(10,14,24,0.95)] text-white">
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {categoryOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="theme-search-input h-12 rounded-2xl text-white" data-testid="actualites-source-select">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent className="theme-panel-surface border-[var(--theme-border-soft)] bg-[rgba(10,14,24,0.95)] text-white">
                    <SelectItem value="all">Toutes les sources</SelectItem>
                    {sourceOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="theme-search-input h-12 rounded-2xl text-white" data-testid="actualites-sort-select">
                    <SelectValue placeholder="Tri" />
                  </SelectTrigger>
                  <SelectContent className="theme-panel-surface border-[var(--theme-border-soft)] bg-[rgba(10,14,24,0.95)] text-white">
                    <SelectItem value="trending">Tendance</SelectItem>
                    <SelectItem value="recent">Plus récent</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="theme-action-button h-12 rounded-2xl text-white" onClick={() => { setSearch(""); setCategory("all"); setSource("all"); setSort("trending"); }} data-testid="actualites-reset-filters-button">
                  <TimerReset className="h-4 w-4" /> Reset
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
              <div className="theme-panel-surface rounded-[1.9rem] border border-[var(--theme-border-soft)] p-5 sm:p-6" data-testid="actualites-trending-bento">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="mt-2 font-display text-3xl font-black text-white">Articles</h2>
                  </div>
                  <Badge variant="outline" className="rounded-full border-[var(--theme-border-soft)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-white/72">
                    {listing.total} articles indexés
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {listing.items.slice(0, 4).map((item, index) => (
                    <NewsCard key={item.slug} item={item} priority={index < 2} testId={`actualites-bento-card-${item.slug}`} />
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <Card className="theme-panel-surface rounded-[1.9rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-source-radar-widget">
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">Radar des sources</p>
                        <h2 className="mt-2 font-display text-2xl font-black">État des flux</h2>
                      </div>
                      <Radar className="h-6 w-6 text-[var(--theme-link)]" />
                    </div>
                    <ScrollArea className="h-[280px] pr-3">
                      <div className="space-y-3">
                        {sourceOptions.map((item) => (
                          <a
                            key={item.id}
                            href={item.site_url || PRIMARY_SITE}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="theme-subpanel flex items-start justify-between gap-3 rounded-[1.3rem] border-none bg-transparent p-4 hover-lift"
                            data-testid={`actualites-source-radar-item-${item.id}`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-white">{item.name}</p>
                              <p className="mt-2 text-xs text-white/68">{item.last_success_at ? `Dernier succès ${relativeTime(item.last_success_at)}` : "Mise à jour en cours"}</p>
                            </div>
                            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${item.status === "ok" ? "bg-emerald-500/12 text-emerald-200 border border-emerald-400/20" : "bg-amber-500/12 text-amber-200 border border-amber-400/20"}`}>
                              {item.status === "ok" ? "OK" : "Synchronisation partielle"}
                            </span>
                          </a>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="theme-panel-surface rounded-[1.9rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-calendar-widget">
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">Widget sorties</p>
                      <h2 className="mt-2 font-display text-2xl font-black">Radar AniList & calendrier</h2>
                    </div>
                    <div className="space-y-3">
                      {home.calendar.slice(0, 4).map((item) => (
                        <Link key={item.slug} to={`/actualites/${item.slug}`} className="theme-subpanel block rounded-[1.3rem] border-none bg-transparent p-4 hover-lift" data-testid={`actualites-calendar-item-${item.slug}`}>
                          <p className="text-[11px] uppercase tracking-[0.26em] text-white/50">{item.anime_ref?.nextEpisode ? `Épisode ${item.anime_ref.nextEpisode}` : item.source_group}</p>
                          <p className="mt-2 text-sm font-semibold text-white/90">{item.title}</p>
                          <p className="mt-2 text-xs text-white/64">{item.anime_ref?.nextAiringAt ? formatDate(item.anime_ref.nextAiringAt) : formatDate(item.published_at)}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start" data-testid="actualites-sidebar-widgets">
            <Card className="theme-panel-surface rounded-[1.8rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-trending-widget">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-white/50">Widget tendance</p>
                    <h2 className="mt-2 font-display text-2xl font-black">Top momentum</h2>
                  </div>
                  <TrendingUp className="h-5 w-5 text-[var(--theme-link-hover)]" />
                </div>
                <div className="space-y-3">
                  {home.trending.slice(0, 6).map((item, index) => (
                    <Link key={item.slug} to={`/actualites/${item.slug}`} className="theme-subpanel flex items-start gap-3 rounded-[1.3rem] border-none bg-transparent p-4 hover-lift" data-testid={`actualites-trending-item-${item.slug}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] font-display text-sm font-black text-white/86">{index + 1}</div>
                      <div>
                        <p className="line-clamp-2 text-sm font-semibold text-white/88">{item.title}</p>
                        <p className="mt-2 text-xs text-white/58">{item.source_group || item.source_name} · {relativeTime(item.published_at)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Widget insights supprimé */}
          </aside>
        </section>

        {/*
        {(["anime", "manga", "gaming", "pop-culture"] as const).map((categoryKey) => (
          <NewsRail key={categoryKey} category={categoryKey} items={home.rails?.[categoryKey] || []} />
        ))}
        */}

        <section className="grid gap-6 xl:grid-cols-[1fr_.42fr]" data-testid="actualites-source-wall-section">
          <Card className="theme-panel-surface rounded-[1.9rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-feed-wall">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="mt-2 font-display text-3xl font-black">Dernières publications</h2>
                </div>
                <div className="text-right text-sm text-white/60">
                  <div>{listing.total} résultats</div>
                  <div>Page {page} / {totalPages}</div>
                </div>
              </div>
              <div className="columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4">
                {listing.items.map((item) => (
                  <NewsCard key={item.slug} item={item} testId={`actualites-grid-card-${item.slug}`} />
                ))}
              </div>
              <div ref={loadMoreRef} className="flex flex-wrap items-center justify-center gap-3 pt-6 pb-4">
                {loadingMore && <div className="text-white/60 text-sm">Chargement des actualités suivantes...</div>}
              </div>
              {false && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button type="button" variant="glass" className="rounded-full text-white" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} data-testid="actualites-pagination-prev">
                    Page précédente
                  </Button>
                  <div className="theme-glass-chip rounded-full px-4 py-2 text-sm text-white/80" data-testid="actualites-pagination-info">
                    {listing.offset + 1}–{Math.min(listing.offset + listing.items.length, listing.total)} sur {listing.total}
                  </div>
                  <Button type="button" variant="glass" className="rounded-full text-white" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} data-testid="actualites-pagination-next">
                    Page suivante
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="theme-panel-surface rounded-[1.9rem] border border-[var(--theme-border-soft)] bg-transparent text-white" data-testid="actualites-source-matrix">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div>
                <h2 className="mt-2 font-display text-3xl font-black">Sources</h2>
              </div>
              <div className="grid gap-3">
                {sourceOptions.map((item) => (
                  <a
                    key={item.id}
                    href={item.site_url || PRIMARY_SITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-subpanel flex items-center justify-between gap-3 rounded-[1.3rem] border-none bg-transparent p-4 hover-lift"
                    data-testid={`actualites-source-matrix-item-${item.id}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-white/56">{(item.categories || []).slice(0, 3).join(" · ")}</p>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </section>
    </PageShell>
  );
}
