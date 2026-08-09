import { useEffect, useMemo, useState, useRef } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";
import { PageShell } from "@/components/PageShell";
import { CalendarRange, Clapperboard, ExternalLink, Heart, Play, PlayCircle, Search, Info, SkipForward, Sparkles, Volume2, VolumeX, Maximize, PictureInPicture2, Pause, Star, Globe, Loader2, Captions } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverPreview } from "@/components/HoverPreview";
import { MangaUniverseBanner } from "@/components/MangaUniverseBanner";
import { ManualSyncButton } from "@/components/ManualSyncButton";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { TranslateCardButton } from "@/components/TranslateCardButton";
import { AudioLanguageSwitcher } from "@/components/AudioLanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCardTranslator } from "@/hooks/useCardTranslator";
import { useAuth } from "@/contexts/AuthContext";


type PrimeSource = {
  provider: string;
  url: string;
  isNative: boolean;
  isPrimeBundle?: boolean;
  logo?: string;
};

type PrimeAnime = {
  id: number;
  title: string;
  cover?: string;
  banner?: string;
  color?: string;
  score?: number;
  year?: number;
  format?: string;
  episodes?: number;
  genres: string[];
  description: string;
  primeUrl?: string;
  trailerId?: string;
  isOnPrime?: boolean;
  sources?: PrimeSource[];
};

const PRIME_CACHE = "lovanet.cache.prime.anime.v2";
const PRIME_WATCH_KEY = "lovanet.prime.watch-tonight.v1";
const PRIME_RECENT_KEY = "lovanet.prime.recent.v1";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Human-friendly labels for the trailer version selector.
const TRAILER_VERSION_LABEL: Record<string, string> = {
  vostfr: "VOSTFR",
  vf: "VF (Doublage)",
  vo: "VO (Japonais)",
  ensub: "English (Sub)",
  endub: "English Dub",
};
const VERSION_ORDER = ["vostfr", "vf", "vo", "ensub", "endub"];

function loadNumberArray(key: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : [];
  } catch {
    return [];
  }
}

function normalizeText(value: string | undefined | null) {
  return String(value || "").toLowerCase();
}

function inferMood(anime: PrimeAnime) {
  const genres = anime.genres.map((genre) => genre.toLowerCase());
  if (genres.some((genre) => ["romance", "slice of life", "comedy"].includes(genre))) return "feelgood";
  if (genres.some((genre) => ["horror", "psychological", "thriller", "mystery"].includes(genre))) return "dark";
  if (genres.some((genre) => ["action", "adventure", "mecha"].includes(genre))) return "action";
  if (genres.some((genre) => ["fantasy", "supernatural", "drama"].includes(genre))) return "epic";
  if (genres.includes("romance")) return "romance";
  return "all";
}

function smartBadges(anime: PrimeAnime) {
  const badges: string[] = [];
  if ((anime.year ?? 0) >= 2024) badges.push("Nouveauté");
  if ((anime.score ?? 0) >= 85) badges.push("Populaire");
  if ((anime.episodes ?? 0) >= 24) badges.push("Long format");
  if ((anime.format || "").toLowerCase().includes("movie")) badges.push("Film");
  const mood = inferMood(anime);
  if (mood === "feelgood") badges.push("Feel good");
  if (mood === "dark") badges.push("Sombre");
  if (mood === "epic") badges.push("Épique");
  if (mood === "romance") badges.push("Romance");
  return badges.slice(0, 4);
}

function shortDescription(value: string) {
  return String(value || "Aucune description disponible.").replace(/\s+/g, " ").trim();
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const PrimeVideo = () => {
  const [muted, setMuted] = useState(true);
  const [mainVideoUnavailable, setMainVideoUnavailable] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [orientation, setOrientation] = useState<"cinema" | "vertical">("cinema");

  const [isPlaying, setIsPlaying] = useState(true);
  const [pipOpen, setPipOpen] = useState(false);
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const [primeFormat, setPrimeFormat] = useState<string>("all");

  
  const [multiTrailers, setMultiTrailers] = useState<Record<string, any[]>>({});
  const [trailerLang, setTrailerLang] = useState<string>("vostfr");
  const [forceFrSubs, setForceFrSubs] = useState<boolean>(false);
  const [activeLang, setActiveLang] = useState<string>("ja");

  const [primeAnime, setPrimeAnime] = useState<PrimeAnime[]>([]);
  const [primeLoading, setPrimeLoading] = useState(true);
  const [primeGenre, setPrimeGenre] = useState<string>("all");
  const [primeMood, setPrimeMood] = useState<string>("all");
  const [primeQuery, setPrimeQuery] = useState("");
  const [primeProvider, setPrimeProvider] = useState<string>("all");
  const [primeNativeOnly, setPrimeNativeOnly] = useState(false);
  
  const [cardLangById, setCardLangById] = useState<Record<number, string>>({});
  const cardTranslator = useCardTranslator("fr");
  const globalTranslator = useCardTranslator("fr");
  const [globalLang, setGlobalLang] = useState<string | null>(null);
  
  const [selectedPrimeId, setSelectedPrimeId] = useState<number | null>(null);
    const { favorites: watchTonightIds, toggleFavorite: toggleWatchTonight } = useAuth();
  const [recentPrimeIds, setRecentPrimeIds] = useState<number[]>(() => loadNumberArray(PRIME_RECENT_KEY));
  const [quickPlayList, setQuickPlayList] = useState<PrimeAnime[]>([]);

  const [visibleCount, setVisibleCount] = useState(48);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const playerSearchResults = useMemo(() => {
    if (!playerSearchQuery.trim()) return [];
    const query = normalizeText(playerSearchQuery);
    return primeAnime.filter(anime => {
      const haystack = `${normalizeText(anime.title)}|${normalizeText(anime.description)}`;
      return haystack.includes(query);
    }).slice(0, 5);
  }, [primeAnime, playerSearchQuery]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const primeGenres = useMemo(() => Array.from(new Set(primeAnime.flatMap((anime) => anime.genres))).sort(), [primeAnime]);

  const primeProviders = useMemo(() => {
    const counter = new Map<string, number>();
    for (const anime of primeAnime) {
      for (const src of anime.sources || []) {
        counter.set(src.provider, (counter.get(src.provider) || 0) + 1);
      }
    }
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([provider, count]) => ({ provider, count }));
  }, [primeAnime]);

  const filteredPrime = useMemo(() => {
    const query = normalizeText(primeQuery);
    return primeAnime.filter((anime) => {
      if (primeGenre !== "all" && !anime.genres.includes(primeGenre)) return false;

      if (primeFormat !== "all") {
        const formatStr = String(anime.format || "").toUpperCase();
        if (primeFormat === "tv" && !(formatStr === "TV" || formatStr === "TV_SHORT")) return false;
        if (primeFormat === "movie" && formatStr !== "MOVIE") return false;
      }

      if (primeMood !== "all" && inferMood(anime) !== primeMood) return false;
      if (primeNativeOnly && !anime.isOnPrime) return false;
      if (primeProvider !== "all") {
        const hasProvider = (anime.sources || []).some((s) => s.provider === primeProvider);
        if (!hasProvider) return false;
      }
      if (query) {
        const haystack = `${normalizeText(anime.title)}|${normalizeText(anime.description)}|${normalizeText(anime.genres.join(" "))}`;
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [primeAnime, primeGenre, primeFormat, primeMood, primeQuery, primeProvider, primeNativeOnly]);

  useEffect(() => {
    setVisibleCount(48);
  }, [primeGenre, primeMood, primeQuery, primeProvider, primeNativeOnly, primeFormat]);

  

  const playedIdsRef = useRef<Set<number>>(new Set());

  

  useEffect(() => {
    try {
      localStorage.setItem(PRIME_RECENT_KEY, JSON.stringify(recentPrimeIds));
    } catch {
      // ignore localStorage sync failures
    }
  }, [recentPrimeIds]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRIME_CACHE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setPrimeAnime(parsed);
          setPrimeLoading(false);
        }
      }
    } catch {
      // ignore cache hydration failures
    }

    const fetchPrime = async () => {
      try {
        const response = await fetch(`${API}/prime/catalog?limit=4000`).catch(() => null);
        if (!response || !response.ok) {
          throw new Error(`prime-catalog-http-${response?.status || "offline"}`);
        }
        const json = await response.json().catch(() => null);
        const snapshot = Array.isArray(json?.items) ? json.items : [];
        if (snapshot.length) {
          setPrimeAnime(snapshot);
          try {
            localStorage.setItem(PRIME_CACHE, JSON.stringify(snapshot.slice(0, 2000)));
          } catch {
            // ignore cache persistence failures
          }
        }
      } catch (error) {
        console.error("Prime catalog sync error", error);
      } finally {
        setPrimeLoading(false);
      }
    };

    fetchPrime();
    const intervalId = setInterval(fetchPrime, 1000 * 60 * 10);
    const onFocus = () => fetchPrime();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchPrime();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Init selections
  useEffect(() => {
    if (!primeAnime.length) return;
    
    // Quick play list (10 random)
    if (quickPlayList.length === 0) {
      setQuickPlayList(shuffleArray(primeAnime).slice(0, 10));
    }
    
    // Auto-select first item if none selected
    if (!selectedPrimeId) {
      // Prefer an anime with a trailer
      const withTrailer = shuffleArray(primeAnime.filter(a => a.trailerId));
      if (withTrailer.length > 0) {
        setSelectedPrimeId(withTrailer[0].id);
        playedIdsRef.current.add(withTrailer[0].id);
      } else {
        setSelectedPrimeId(primeAnime[0].id);
        playedIdsRef.current.add(primeAnime[0].id);
      }
    }
  }, [primeAnime, selectedPrimeId, quickPlayList.length]);

  const selectedPrime = primeAnime.find((anime) => anime.id === selectedPrimeId) || null;
  const mapPrimeById = useMemo(() => new Map(primeAnime.map((anime) => [anime.id, anime])), [primeAnime]);
  const watchTonight = useMemo(() => watchTonightIds.map((id) => mapPrimeById.get(id)).filter(Boolean) as PrimeAnime[], [mapPrimeById, watchTonightIds]);
  const resumeLater = useMemo(() => recentPrimeIds.map((id) => mapPrimeById.get(id)).filter(Boolean) as PrimeAnime[], [mapPrimeById, recentPrimeIds]);

  const visibleAnimeForTranslation = useMemo(() => {
    const list = [
      ...quickPlayList,
      ...watchTonight,
      ...resumeLater,
      ...filteredPrime.slice(0, visibleCount),
    ];
    if (selectedPrime) list.push(selectedPrime);
    
    const uniqueMap = new Map();
    for (const a of list) {
      if (!uniqueMap.has(a.id)) uniqueMap.set(a.id, a);
    }
    return Array.from(uniqueMap.values()) as PrimeAnime[];
  }, [quickPlayList, watchTonight, resumeLater, filteredPrime, visibleCount, selectedPrime]);

  useEffect(() => {
    if (!selectedPrimeId || !selectedPrime) return;
    
    // Fetch multilingual trailers
    fetch(`${API}/prime/multilingual-trailers?q=${encodeURIComponent(selectedPrime.title)}`)
      .then(res => res.json())
      .then(data => {
        if (data.results) {
          setMultiTrailers(data.results);
          // Choose a French-first default version: VOSTFR, then VF, then any
          // available version (VO / EN). We never fall back to an English-subbed
          // trailer for the French option — the backend classifies versions.
          const order = ["vostfr", "vf", "vo", "ensub", "endub"];
          const firstAvailable = order.find((code) => Array.isArray(data.results[code]) && data.results[code].length > 0);
          if (firstAvailable) {
            setTrailerLang(firstAvailable);
          } else if (Object.keys(data.results).length > 0) {
            setTrailerLang(Object.keys(data.results)[0]);
          } else {
            setTrailerLang("vo");
          }
        } else {
          setMultiTrailers({});
        }
      })
      .catch(() => setMultiTrailers({}));
  }, [selectedPrimeId, selectedPrime, globalLang]);

  // Robustly extract a real YouTube video id for a language bucket.
  // The backend may return objects ({ id }) or raw id strings.
  const extractLangId = (arr: any): string | undefined => {
    if (Array.isArray(arr) && arr.length > 0) {
      const first: any = arr[0];
      const id = typeof first === "string" ? first : first?.id;
      if (id) return id as string;
    }
    return undefined;
  };

  // Versions we can actually play, in a French-first order: VOSTFR, VF, VO,
  // English sub, English dub. Only versions with a real, classified video id
  // are offered — so the French option is never an English-subbed trailer.
  const availableTrailerLangs = useMemo<string[]>(() => {
    const langs: string[] = [];
    for (const code of VERSION_ORDER) {
      if (extractLangId(multiTrailers[code])) langs.push(code);
    }
    // The title's own AniList trailer is the original (VO) as a last resort.
    if (!langs.includes("vo") && selectedPrime?.trailerId) langs.push("vo");
    return langs.length ? langs : ["vo"];
  }, [multiTrailers, selectedPrime]);

  // Ordered list of candidate video ids for the selected version. On region
  // blocks / unavailable videos we auto-advance to the next candidate.
  const extractLangIds = (arr: any): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map((x: any) => (typeof x === "string" ? x : x?.id)).filter(Boolean);
  };

  const activeTrailerCandidates = useMemo<string[]>(() => {
    const ids = extractLangIds(multiTrailers[trailerLang]);
    // Only the original (VO) may fall back to the title's own trailer.
    if (trailerLang === "vo" && selectedPrime?.trailerId && !ids.includes(selectedPrime.trailerId)) {
      ids.push(selectedPrime.trailerId);
    }
    return ids;
  }, [multiTrailers, trailerLang, selectedPrime]);

  // Source label (e.g. "Crunchyroll FR") per version, for the switcher.
  const trailerSources = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const code of Object.keys(multiTrailers || {})) {
      const arr: any = multiTrailers[code];
      const first = Array.isArray(arr) ? arr[0] : null;
      if (first && typeof first !== "string" && first.source) out[code] = first.source;
    }
    if (!out.vo && selectedPrime?.trailerId) out.vo = "Bande-annonce officielle";
    return out;
  }, [multiTrailers, selectedPrime]);

  // Reset the candidate cursor whenever the version or the selected title changes.
  useEffect(() => {
    setCandidateIndex(0);
    setMainVideoUnavailable(false);
  }, [trailerLang, selectedPrimeId]);

  const activeTrailerId = useMemo<string | undefined>(() => {
    if (activeTrailerCandidates.length === 0) return selectedPrime?.trailerId;
    return activeTrailerCandidates[Math.min(candidateIndex, activeTrailerCandidates.length - 1)];
  }, [activeTrailerCandidates, candidateIndex, selectedPrime]);

  // Advance to the next candidate when a trailer is region-blocked/unavailable.
  const handleTrailerUnavailable = () => {
    if (candidateIndex + 1 < activeTrailerCandidates.length) {
      setMainVideoUnavailable(false);
      setCandidateIndex(candidateIndex + 1);
    } else {
      setMainVideoUnavailable(true);
    }
  };

  // Keep the selected version valid for the currently available versions.
  useEffect(() => {
    if (!availableTrailerLangs.includes(trailerLang)) {
      setTrailerLang(availableTrailerLangs[0]);
    }
  }, [availableTrailerLangs, trailerLang]);

  useEffect(() => {
    if (globalLang) {
      const textsToTranslate = new Set<string>();
      for (const anime of visibleAnimeForTranslation) {
        if (anime.title) textsToTranslate.add(anime.title);
        if (anime.description) textsToTranslate.add(shortDescription(anime.description));
      }
      globalTranslator.translate(Array.from(textsToTranslate), globalLang);
    }
  }, [globalLang, visibleAnimeForTranslation]);

  const mapGlobalText = (text?: string | null) => {
    if (!text) return "";
    if (globalLang) return globalTranslator.getText(text);
    return text;
  };

  const translateCard = async (anime: PrimeAnime, targetLang: string) => {
    await cardTranslator.translate([anime.title, shortDescription(anime.description)], targetLang);
    setCardLangById((current) => ({ ...current, [anime.id]: targetLang }));
  };

  const resetCard = (animeId: number) => {
    setCardLangById((current) => {
      const clone = { ...current };
      delete clone[animeId];
      return clone;
    });
  };

  const displayCardTitle = (anime: PrimeAnime) => {
    if (cardLangById[anime.id]) return cardTranslator.getText(anime.title);
    if (globalLang) return globalTranslator.getText(anime.title);
    return anime.title;
  };

  const displayCardDescription = (anime: PrimeAnime) => {
    const original = shortDescription(anime.description);
    if (cardLangById[anime.id]) return cardTranslator.getText(original);
    if (globalLang) return globalTranslator.getText(original);
    return original;
  };

  const selectPrimeAnime = (anime: PrimeAnime) => {
    setMainVideoUnavailable(false);
    setSelectedPrimeId(anime.id);
    playedIdsRef.current.add(anime.id);
    setRecentPrimeIds((current) => [anime.id, ...current.filter((id) => id !== anime.id)].slice(0, 10));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNextRandom = () => {
    if (!primeAnime.length) return;
    
    // Find unplayed videos with trailers
    let candidates = primeAnime.filter(a => a.trailerId && !playedIdsRef.current.has(a.id));
    
    // If all played, reset played list
    if (candidates.length === 0) {
      playedIdsRef.current.clear();
      candidates = primeAnime.filter(a => a.trailerId);
    }
    
    if (candidates.length > 0) {
      const nextAnime = candidates[Math.floor(Math.random() * candidates.length)];
      selectPrimeAnime(nextAnime);
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data);
        if (data?.event === "onStateChange" && data?.info === 0 && autoplayNext) {
          goNextRandom();
        }
      } catch {
        // ignore invalid messages
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [autoplayNext, primeAnime]);

  

  const mainVideoBackdrop = selectedPrime?.banner || selectedPrime?.cover;


  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo?.();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo?.();
        setIsPlaying(true);
      }
    }
  };

  const toggleFullscreen = () => {
    if (playerContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerContainerRef.current.requestFullscreen();
      }
    }
  };

  const openPiP = async () => {
    if (!selectedPrime?.trailerId) return;
    try {
      if ((window as any).documentPictureInPicture?.requestWindow) {
        const dpip = (window as any).documentPictureInPicture;
        const pipWindow = await dpip.requestWindow({ width: 640, height: 360 });
        pipWindowRef.current = pipWindow;
        pipWindow.document.head.innerHTML = `<style>
          body{margin:0;background:#000;display:flex;height:100vh;}
          iframe{width:100%;height:100%;border:0;}
        </style>`;
        pipWindow.document.body.innerHTML = `<iframe src="${buildYouTubeEmbedUrl(selectedPrime.trailerId, { autoplay: true, muted: false, controls: true, playsInline: true })}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        setPipOpen(true);
        pipWindow.addEventListener("pagehide", () => {
          pipWindowRef.current = null;
          setPipOpen(false);
        });
        if (isPlaying) {
          playerRef.current?.pauseVideo?.();
          setIsPlaying(false);
        }
      } else {
        alert("Picture-in-Picture n'est pas supporté par votre navigateur (essayez un navigateur basé sur Chromium).");
      }
    } catch (e) {
      console.warn("PiP failed", e);
    }
  };


  if (primeLoading && primeAnime.length === 0) {
    return (
      <PageShell>
        <section className="container mx-auto px-4 py-24 text-center text-muted-foreground">
          Chargement de la bibliothèque Prime…
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>

      <section className="container mx-auto px-4 lg:px-8 py-10 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Streaming partenaire</p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold">
          <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Prime Vidéo</span>
        </h1>
      </section>

      {selectedPrime && (
        <section className="w-full pb-8 pt-4" data-testid="prime-main-player-section">
          <div className="container mx-auto px-4 lg:px-8 flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold flex items-center gap-1.5">◆ prime</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">lecteur premium</div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {globalLang ? (
                <Button type="button" variant="glass" className="rounded-full text-[11px] font-semibold uppercase tracking-wider border-fuchsia-300/60 bg-fuchsia-500/25 text-fuchsia-100 h-8 px-3" onClick={() => setGlobalLang(null)}>
                  <Globe className="w-3.5 h-3.5 mr-1.5" /> Rétablir l'original
                </Button>
              ) : (
                <Button type="button" variant="glass" className="rounded-full text-[11px] font-semibold uppercase tracking-wider border-white/20 bg-black/40 text-white/85 hover:border-white/50 h-8 px-3" onClick={() => setGlobalLang("fr")} disabled={globalTranslator.loading}>
                  {globalTranslator.loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 mr-1.5" />}
                  Traduire le catalogue
                </Button>
              )}
              
              {selectedPrime && availableTrailerLangs.length > 1 && (
                <AudioLanguageSwitcher 
                  activeLang={trailerLang}
                  languages={availableTrailerLangs}
                  sources={trailerSources}
                  onLanguageChange={(lang) => {
                    setActiveLang(lang);
                    // Switch language -> reload the embed with that version's trailer.
                    setTrailerLang(lang);
                    setMainVideoUnavailable(false);
                    setIsPlaying(true);
                  }}
                />
              )}
              
              <Button type="button" variant="glass" className="rounded-full text-xs h-8 px-3" onClick={() => setMuted((value) => !value)} data-testid="prime-mute-toggle-button">
                {muted ? <VolumeX className="w-3.5 h-3.5 mr-1.5" /> : <Volume2 className="w-3.5 h-3.5 mr-1.5" />}
                {muted ? "Activer son" : "Muet"}
              </Button>
              <div className="inline-flex p-1 rounded-full bg-secondary border border-border">
                <button onClick={() => setOrientation("cinema")} className={cn("px-3 py-1 text-[11px] rounded-full font-semibold", orientation === "cinema" ? "bg-background shadow-sm" : "text-muted-foreground")} data-testid="prime-orientation-cinema-button">
                  ▭ Cinéma
                </button>
                <button onClick={() => setOrientation("vertical")} className={cn("px-3 py-1 text-[11px] rounded-full font-semibold", orientation === "vertical" ? "bg-background shadow-sm" : "text-muted-foreground")} data-testid="prime-orientation-vertical-button">
                  ▯ Vertical
                </button>
              </div>
            </div>
          </div>

          <div ref={playerContainerRef} className={cn("mx-auto w-full max-w-[1600px] rounded-[2rem] overflow-hidden bg-black border border-sky-500/30 shadow-[0_40px_120px_-40px_hsl(211_100%_50%/0.5)] relative transition-all duration-300", orientation === "cinema" ? "aspect-video" : "aspect-[9/16] max-w-md")}>
            <div className="relative h-full w-full bg-black flex items-center justify-center group">
              {(!mainVideoUnavailable && activeTrailerId) ? (
                <>
                  <YouTubeEmbed
                    key={`prime-main-${trailerLang}-${candidateIndex}-${activeTrailerId}-${forceFrSubs ? "frsub" : "nosub"}`}
                    videoId={activeTrailerId}
                    title={selectedPrime.title}
                    captionLang={(forceFrSubs || trailerLang === "vostfr") ? "fr" : undefined}
                    autoplay
                    muted={muted}
                    hideControls
                    onPlayerReady={(player) => { playerRef.current = player; setIsPlaying(true); }}
                    onUnavailable={handleTrailerUnavailable}
                    onExhausted={handleTrailerUnavailable}
                    onPlayerStateChange={(state) => {
                      if (state === 0 && autoplayNext) goNextRandom();
                      else if (state === 1) setIsPlaying(true);
                      else if (state === 2) setIsPlaying(false);
                    }}
                    className="absolute inset-0 h-full w-full pointer-events-none"
                  />
                  <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay} />

                  {/* Current version badge + FR subtitles toggle overlay */}
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 flex items-center gap-2">
                    <span
                      data-testid="prime-version-badge"
                      className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] font-black tracking-wider text-white shadow-lg"
                    >
                      {TRAILER_VERSION_LABEL[trailerLang] || trailerLang.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      data-testid="prime-subtitle-toggle"
                      onClick={(e) => { e.stopPropagation(); setForceFrSubs((v) => !v); }}
                      title="Forcer les sous-titres français (si disponibles)"
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold border backdrop-blur-md transition ${forceFrSubs ? "bg-sky-500/80 border-sky-300 text-white" : "bg-black/60 border-white/20 text-white/80 hover:bg-white/10"}`}
                    >
                      <Captions className="w-3.5 h-3.5 mr-1" /> ST FR
                    </button>
                  </div>
                  
                  {/* Smart Search Bar Overlay */}
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 w-full max-w-xs transition-opacity duration-300 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                      <Input 
                        value={playerSearchQuery}
                        onChange={(e) => setPlayerSearchQuery(e.target.value)}
                        placeholder="Recherche rapide d'un titre..." 
                        className="h-10 pl-9 rounded-full bg-black/40 border border-white/20 text-white placeholder:text-white/50 backdrop-blur-md focus-visible:ring-sky-500 focus-visible:border-sky-500"
                      />
                      {playerSearchQuery && playerSearchResults.length > 0 && (
                        <div className="absolute top-full mt-2 left-0 right-0 max-h-64 overflow-y-auto bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-2 z-40">
                          {playerSearchResults.map(result => (
                            <button
                              key={`search-res-${result.id}`}
                              className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-white/10 transition-colors"
                              onClick={() => { selectPrimeAnime(result); setPlayerSearchQuery(''); }}
                            >
                              {result.cover ? <img src={result.cover} className="w-8 h-10 object-cover rounded shadow" alt=""/> : <div className="w-8 h-10 bg-white/10 rounded"/>}
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-white line-clamp-1">{displayCardTitle(result)}</p>
                                <p className="text-[9px] text-white/60">{result.format || "Anime"}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <div className="flex items-center gap-6 text-white max-w-7xl mx-auto w-full">
                      <button onClick={togglePlay} className="hover:text-sky-400 transition transform hover:scale-110">
                        {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current" />}
                      </button>
                      <button onClick={() => {
                        if (muted) { playerRef.current?.unMute?.(); setMuted(false); }
                        else { playerRef.current?.mute?.(); setMuted(true); }
                      }} className="hover:text-sky-400 transition">
                        {muted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
                      </button>
                      
                      <div className="flex-1 font-display font-bold text-xl drop-shadow-md truncate px-4">
                        {mapGlobalText(selectedPrime.title)}
                        {availableTrailerLangs.length > 1 && (
                          <div className="inline-flex ml-4" data-testid="prime-language-selector-container">
                            <select 
                              value={trailerLang} 
                              onChange={(e) => {
                                setTrailerLang(e.target.value);
                                setMainVideoUnavailable(false);
                                setIsPlaying(true);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-bold uppercase tracking-wider bg-black/60 border border-white/20 text-white rounded-full px-3 py-1 cursor-pointer hover:bg-white/10 outline-none"
                              data-testid="prime-language-selector"
                            >
                              {availableTrailerLangs.map(lang => (
                                <option key={lang} value={lang} data-testid={`prime-language-option-${lang}`}>
                                  {TRAILER_VERSION_LABEL[lang] || lang.toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <button onClick={openPiP} className="hover:text-sky-400 transition bg-white/10 hover:bg-white/20 p-2 rounded-full" title="Picture in Picture">
                        <PictureInPicture2 className="w-6 h-6" />
                      </button>
                      <button onClick={toggleFullscreen} className="hover:text-sky-400 transition bg-white/10 hover:bg-white/20 p-2 rounded-full" title="Plein écran">
                        <Maximize className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="relative flex h-full w-full items-end overflow-hidden bg-black" data-testid="prime-main-player-fallback">
                  {mainVideoBackdrop ? <img src={mainVideoBackdrop} alt={selectedPrime.title} className="absolute inset-0 h-full w-full object-cover opacity-70" loading="eager" /> : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Clapperboard className="w-24 h-24 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.9))]" />
                  <div className="relative z-10 space-y-3 p-6 sm:p-8">
                    <Badge className="rounded-full border border-white/10 bg-[rgba(8,12,24,0.5)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/84">Lecture non disponible</Badge>
                    <h2 className="max-w-3xl font-display text-3xl font-black text-white">{mapGlobalText(selectedPrime.title)}</h2>
                    <p className="max-w-2xl text-base leading-7 text-white/72">Le trailer n’est pas disponible pour ce titre. Vous pouvez passer au suivant aléatoirement.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="glass" className={cn("rounded-full text-sm", autoplayNext ? "border-sky-500/60 text-sky-300" : "")} onClick={() => setAutoplayNext((value) => !value)} data-testid="prime-autoplay-toggle-button">
              <Play className="w-4 h-4 fill-current" /> Lecture auto {autoplayNext ? "ON" : "OFF"}
            </Button>
            <div className="text-xs text-muted-foreground flex-1 text-center px-4 line-clamp-1">{mapGlobalText(selectedPrime.title)}</div>
            <Button type="button" className="rounded-full text-white shadow-lg shadow-sky-500/20" onClick={goNextRandom} data-testid="prime-next-button">
              Suivant Aléatoire <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-8 max-w-5xl mx-auto bg-card/40 backdrop-blur-sm border border-white/10 rounded-[2rem] p-6 sm:p-8">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2" data-testid="prime-hero-badges-row">
                <Badge className="rounded-full border border-sky-300/20 bg-sky-400/10 text-sky-200">Prime sélection</Badge>
                <Badge variant="outline" className="rounded-full border-white/15 bg-white/5 text-white/80">{selectedPrime.format || "Anime"}</Badge>
                {selectedPrime.year && <Badge variant="outline" className="rounded-full border-white/15 bg-white/5 text-white/80"><CalendarRange className="mr-1 h-3.5 w-3.5" />{selectedPrime.year}</Badge>}
                {typeof selectedPrime.score === "number" && <Badge variant="outline" className="rounded-full border-white/15 bg-white/5 text-white/80">{selectedPrime.score}/100</Badge>}
              </div>

              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-3xl sm:text-4xl font-black flex-1" data-testid="prime-hero-anime-title">{displayCardTitle(selectedPrime)}</h3>
                  <TranslateCardButton
                    size="sm"
                    align="end"
                    activeLang={cardLangById[selectedPrime.id] || null}
                    loading={cardTranslator.loading}
                    onTranslate={(lang) => translateCard(selectedPrime, lang)}
                    onClear={() => resetCard(selectedPrime.id)}
                  />
                </div>
                <p className="mt-4 text-base leading-relaxed text-white/72 max-w-4xl" data-testid="prime-hero-anime-description">{displayCardDescription(selectedPrime)}</p>
              </div>

              <div className="flex flex-wrap gap-2" data-testid="prime-smart-badges-row">
                {smartBadges(selectedPrime).map((badge) => (
                  <span key={`${selectedPrime.id}-${badge}`} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/84">
                    {badge}
                  </span>
                ))}
                {(selectedPrime.genres || []).slice(0, 4).map((genre) => (
                  <span key={`${selectedPrime.id}-${genre}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/72">
                    {genre}
                  </span>
                ))}
              </div>

              {selectedPrime.sources && selectedPrime.sources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2" data-testid="prime-hero-sources-row">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-white/48 self-center mr-1">Disponible sur ·</span>
                  {selectedPrime.sources.map((src) => (
                    <a
                      key={`hero-src-${src.provider}`}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-semibold transition-colors shadow-sm",
                        src.isNative
                          ? "border-sky-400/60 bg-sky-500/25 text-sky-100 hover:bg-sky-500/40 shadow-sky-500/10"
                          : "border-white/15 bg-white/[0.05] text-white/85 hover:border-white/40"
                      )}
                      data-testid={`prime-hero-source-${src.provider.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      {src.provider}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="button" className="rounded-full text-white shadow-lg" onClick={() => toggleWatchTonight(selectedPrime.id)} data-testid="prime-watch-tonight-toggle-button">
                  <Heart className={`h-4 w-4 ${watchTonightIds.includes(selectedPrime.id) ? "fill-current text-rose-400" : ""}`} />
                  {watchTonightIds.includes(selectedPrime.id) ? "Retirer de ce soir" : "À regarder ce soir"}
                </Button>
                {selectedPrime.primeUrl && (
                  <Button asChild variant="glass" className="rounded-full text-white" data-testid="prime-hero-open-external-button">
                    <a href={selectedPrime.primeUrl} target="_blank" rel="noopener noreferrer">
                      Ouvrir Prime <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* QUICK PLAY STRIP */}
      {quickPlayList.length > 0 && (
        <section className="container mx-auto px-4 lg:px-8 pb-8" data-testid="prime-quick-play-section">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-xl font-bold text-white">Lecture rapide</h3>
            <Button variant="ghost" size="sm" onClick={() => setQuickPlayList(shuffleArray(primeAnime).slice(0, 10))} className="text-xs text-sky-400 hover:text-sky-300">
              Rafraîchir
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
            {quickPlayList.map((anime) => {
              const active = selectedPrimeId === anime.id;
              return (
                <button
                  key={`quickplay-${anime.id}`}
                  onClick={() => selectPrimeAnime(anime)}
                  className={cn(
                    "group relative min-w-[160px] w-[160px] sm:min-w-[200px] sm:w-[200px] rounded-2xl overflow-hidden border snap-start transition-all duration-300 text-left",
                    active ? "border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)] scale-[1.02]" : "border-white/10 hover:border-white/30"
                  )}
                >
                  <div className="aspect-video bg-black relative">
                    {(anime.banner || anime.cover) ? (
                      <img src={anime.banner || anime.cover} alt={anime.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-900"><Clapperboard className="text-white/20" /></div>
                    )}
                    {active && <div className="absolute inset-0 bg-sky-500/20 mix-blend-overlay" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-sm font-bold text-white line-clamp-2 leading-tight">{mapGlobalText(anime.title)}</p>
                    </div>
                    {anime.trailerId && (
                      <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 backdrop-blur-md">
                        <Play className="w-3 h-3 text-white ml-0.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!!watchTonight.length && (
        <section className="container mx-auto px-4 lg:px-8 pb-6" data-testid="prime-watch-tonight-section">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-xl font-bold text-white">À regarder ce soir</h3>
            <span className="text-xs text-muted-foreground">{watchTonight.length} sélection{watchTonight.length > 1 ? "s" : ""}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {watchTonight.map((anime) => (
              <button
                key={`watch-tonight-${anime.id}`}
                type="button"
                onClick={() => selectPrimeAnime(anime)}
                className="flex min-w-[220px] items-center gap-3 rounded-[1.2rem] border border-white/10 bg-card/60 px-3 py-3 text-left transition-colors hover:border-sky-400/60"
                data-testid={`prime-watch-tonight-chip-${anime.id}`}
              >
                <div className="h-14 w-11 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                  {anime.cover ? <img src={anime.cover} alt={anime.title} className="h-full w-full object-cover" loading="lazy" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-white">{mapGlobalText(anime.title)}</p>
                  <p className="mt-1 text-xs text-white/60">{anime.format || "Anime"} · {anime.year || "—"}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!!resumeLater.length && (
        <section className="container mx-auto px-4 lg:px-8 pb-6" data-testid="prime-resume-later-section">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-white">Reprendre plus tard</h3>
            <span className="text-xs text-muted-foreground">Historique local</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {resumeLater.slice(0, 8).map((anime) => (
              <button
                key={`resume-${anime.id}`}
                type="button"
                onClick={() => selectPrimeAnime(anime)}
                className="rounded-full border border-white/10 bg-card/60 px-3 py-2 text-xs text-white/82 transition-colors hover:border-sky-400/60"
                data-testid={`prime-resume-chip-${anime.id}`}
              >
                {mapGlobalText(anime.title)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 lg:px-8 pb-16" data-testid="prime-anime-library-section">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-xl font-bold text-white">
            Animés disponibles sur Prime Video
            <span className="text-muted-foreground font-normal"> · {filteredPrime.length}/{primeAnime.length} titres</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {primeLoading && <span className="text-muted-foreground">Synchronisation…</span>}
            <div className="relative min-w-[190px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={primeQuery} onChange={(event) => setPrimeQuery(event.target.value)} placeholder="Recherche rapide…" className="h-10 rounded-full pl-9 text-sm" data-testid="prime-search-input" />
            </div>
            
            <select value={primeFormat} onChange={(event) => setPrimeFormat(event.target.value)} className="bg-secondary border border-border rounded-full px-3 py-2" aria-label="Filtrer par format" data-testid="prime-format-select">
              <option value="all">Tous les formats</option>
              <option value="tv">Séries TV</option>
              <option value="movie">Films</option>
            </select>

            <select value={primeGenre} onChange={(event) => setPrimeGenre(event.target.value)} className="bg-secondary border border-border rounded-full px-3 py-2" aria-label="Filtrer par genre" data-testid="prime-genre-select">
              <option value="all">Tous les genres</option>
              {primeGenres.map((genre) => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            <select value={primeMood} onChange={(event) => setPrimeMood(event.target.value)} className="bg-secondary border border-border rounded-full px-3 py-2" aria-label="Filtrer par ambiance" data-testid="prime-mood-select">
              <option value="all">Toutes les ambiances</option>
              <option value="action">Action</option>
              <option value="feelgood">Feel good</option>
              <option value="dark">Sombre</option>
              <option value="epic">Épique</option>
              <option value="romance">Romance</option>
            </select>
            <button
              type="button"
              onClick={() => setPrimeNativeOnly((v) => !v)}
              aria-pressed={primeNativeOnly}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                primeNativeOnly
                  ? "border-sky-400/60 bg-sky-500/25 text-sky-100 shadow-[0_0_18px_-6px_rgba(56,189,248,0.9)]"
                  : "border-border bg-secondary text-muted-foreground hover:text-white"
              )}
              data-testid="prime-native-only-toggle"
            >
              {primeNativeOnly ? "✓ " : ""}Native Amazon Prime
            </button>
          </div>
        </div>

        {primeProviders.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2" data-testid="prime-provider-chips-row">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Plateformes ·</span>
            <button
              type="button"
              onClick={() => setPrimeProvider("all")}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                primeProvider === "all"
                  ? "border-sky-400/60 bg-sky-500/25 text-sky-100"
                  : "border-white/12 bg-white/[0.04] text-white/70 hover:text-white"
              )}
              data-testid="prime-provider-chip-all"
            >
              Toutes ({primeAnime.length})
            </button>
            {primeProviders.map(({ provider, count }) => (
              <button
                key={provider}
                type="button"
                onClick={() => setPrimeProvider((cur) => (cur === provider ? "all" : provider))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors",
                  primeProvider === provider
                    ? "border-fuchsia-300/60 bg-fuchsia-500/25 text-fuchsia-100"
                    : "border-white/12 bg-white/[0.04] text-white/78 hover:text-white hover:border-white/25"
                )}
                data-testid={`prime-provider-chip-${provider.replace(/\s+/g, "-").toLowerCase()}`}
              >
                <span>{provider}</span>
                <span className="rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-bold text-white/80 font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-12" data-testid="prime-anime-grid" data-visible-count={visibleCount} data-filtered-length={filteredPrime.length}>
          {filteredPrime.slice(0, visibleCount).map((anime, index) => {
            const poster = anime.cover || anime.banner || "";
            const activeCard = selectedPrimeId === anime.id;
            const isSaved = watchTonightIds.includes(anime.id);
            return (
              <article
                key={`prime-${anime.id}`}
                className={cn(
                  "group relative overflow-hidden rounded-[1.2rem] border text-white transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 cursor-pointer",
                  activeCard ? "border-sky-400/60 shadow-[0_14px_28px_rgba(14,165,233,0.24)]" : "border-white/10 shadow-[0_8px_18px_rgba(6,12,24,0.16)] hover:border-sky-400/40"
                )}
                data-testid={`prime-card-${anime.id}`}
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))",
                  backdropFilter: "blur(1px)",
                }}
                onClick={() => selectPrimeAnime(anime)}
              >
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent_18%,transparent_82%,rgba(255,255,255,0.04))]" />
                <div className="relative aspect-[3/4] overflow-hidden rounded-t-[1.2rem] border-b border-white/10 bg-[rgba(255,255,255,0.04)]" data-testid={`prime-card-select-${anime.id}`}>
                  {poster ? (
                    <img
                      src={poster}
                      alt={anime.title}
                      loading={index < 8 ? "eager" : "lazy"}
                      decoding="async"
                      fetchPriority={index < 4 ? "high" : "auto"}
                      className="h-full w-full object-cover object-center saturate-[1.15] contrast-[1.05] transition-transform duration-300 group-hover:scale-[1.015]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-black/40"><Clapperboard className="w-8 h-8 opacity-20" /></div>
                  )}
                  <div className="pointer-events-none absolute inset-0 rounded-t-[1.2rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_0_20px_rgba(255,255,255,0.08)]" />
                  
                  <div className="absolute left-2 top-2 right-2 flex items-start justify-between gap-2">
                    <Badge className="rounded-full border border-white/14 bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/88 shadow-sm backdrop-blur-md">
                      {anime.format || "Anime"}
                    </Badge>
                    <div className="flex items-center gap-2 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="glass"
                        className="h-8 w-8 rounded-full border border-sky-400/50 bg-sky-500/20 text-sky-100 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:bg-sky-500/40 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); selectPrimeAnime(anime); }}
                        data-testid={`catalog-card-bubble-play-${anime.id}`}
                      >
                        <Play className="h-4 w-4 ml-0.5 fill-current" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="glass"
                        className="h-8 w-8 rounded-full border border-white/15 bg-black/40 text-white/90 hover:bg-white/20 hover:text-white"
                        onClick={(e) => { e.stopPropagation(); selectPrimeAnime(anime); }}
                        data-testid={`catalog-card-bubble-info-${anime.id}`}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                    <span className="inline-flex min-h-[28px] items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.08)] px-2 text-[9px] text-white/84 shadow-sm backdrop-blur-md">
                      {typeof anime.score === "number" ? `${anime.score} / 100` : "Score en cours"}
                    </span>
                    {(anime.trailerId || anime.primeUrl) && (
                      <span className="inline-flex min-h-[28px] items-center rounded-full border border-white/12 bg-[rgba(255,255,255,0.08)] px-2 text-[9px] text-white/88 shadow-sm backdrop-blur-md">
                        <PlayCircle className="mr-1 h-3 w-3 text-sky-400" /> Vidéo
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="relative space-y-2 p-2.5 z-10">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="line-clamp-2 font-display text-[12px] font-black leading-tight text-white group-hover:text-sky-300 transition-colors" data-testid={`prime-card-title-${anime.id}`}>
                        {displayCardTitle(anime)}
                      </h3>
                      <div onClick={(e) => e.stopPropagation()}>
                        <TranslateCardButton
                          size="xs"
                          compact
                          align="end"
                          activeLang={cardLangById[anime.id] || null}
                          loading={cardTranslator.loading}
                          onTranslate={(lang) => translateCard(anime, lang)}
                          onClear={() => resetCard(anime.id)}
                        />
                      </div>
                    </div>
                    {cardLangById[anime.id] && (
                      <p className="line-clamp-2 text-[10px] leading-4 opacity-80 text-white/90" data-testid={`prime-card-desc-${anime.id}`}>
                        {displayCardDescription(anime)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1" data-testid={`prime-card-tags-${anime.id}`}>
                    <span className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-1.5 py-1 text-[8px] opacity-90">{anime.year || "Catalogue"}</span>
                    {anime.episodes && <span className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-1.5 py-1 text-[8px] opacity-90">{anime.episodes} ép.</span>}
                    {smartBadges(anime).slice(0,1).map((b) => <span key={b} className="rounded-full border border-sky-400/20 bg-[rgba(56,189,248,0.1)] text-sky-200 px-1.5 py-1 text-[8px]">{b}</span>)}
                  </div>

                  {anime.sources && anime.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1" data-testid={`prime-card-sources-${anime.id}`}>
                      {anime.sources.slice(0, 3).map((src) => (
                        <a
                          key={`${anime.id}-${src.provider}`}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider",
                            src.isNative
                              ? "border-sky-400/60 bg-[rgba(56,189,248,0.2)] text-sky-100"
                              : "border-white/12 bg-[rgba(255,255,255,0.04)] text-white/72 hover:text-white transition-colors"
                          )}
                        >
                          {src.provider}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-1 pt-1">
                    <Button type="button" className="btn-neon-rainbow min-h-[28px] rounded-lg px-1.5 text-[9px] text-white" onClick={(e) => { e.stopPropagation(); selectPrimeAnime(anime); }} data-testid={`prime-card-hero-button-${anime.id}`}>
                      <Play className="h-3 w-3 mr-1" /> Envoyer
                    </Button>
                    <Button type="button" variant="glass" className={cn("min-h-[26px] rounded-lg px-1.5 text-[9px] text-white border-white/10 hover:border-white/20 hover:bg-white/5", isSaved ? "border-primary/60 text-primary" : "")} onClick={(e) => { e.stopPropagation(); toggleWatchTonight(anime.id); }} data-testid={`prime-card-watch-button-${anime.id}`}>
                      <Heart className={cn("h-3 w-3 mr-1.5", isSaved ? "fill-current" : "")} /> {isSaved ? "Retirer" : "Favori"}
                    </Button>
                  </div>
                </CardContent>
              </article>
            );
          })}

          {!primeLoading && filteredPrime.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-8">Aucun titre disponible pour ce filtre.</div>
          )}
        </div>
        {visibleCount < filteredPrime.length && (
          <div className="py-8 flex justify-center col-span-full">
            <Button onClick={() => setVisibleCount(v => v + 48)} variant="glass" className="rounded-full px-8 py-6 text-white border-white/20 hover:bg-white/10">
              Afficher la suite ({filteredPrime.length - visibleCount} restants)
            </Button>
          </div>
        )}
      </section>
      <MangaUniverseBanner />
    </PageShell>
  );
};

export default PrimeVideo;
