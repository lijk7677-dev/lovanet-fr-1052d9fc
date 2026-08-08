import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { videos as fallbackVideos, thumb as ytThumb } from "@/data/videos";
import { IMPORTED_VIDEOS } from "@/data/importedVideos";
import {
  Youtube,
  ExternalLink,
  Calendar,
  Sparkles,
  Volume2,
  VolumeX,
  ArrowRight,
  Play,
  Search,
  X,
  ChevronDown,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminRemoveVideo } from "@/components/AdminRemoveVideo";
import { ManualSyncButton } from "@/components/ManualSyncButton";
import { ResilientVideoFrame } from "@/components/ResilientVideoFrame";
import { supabase } from "@/integrations/supabase/client";
import { createImageFallbackHandler, siteFallbackImage } from "@/lib/mediaFallback";
import { hydrateYouTubeAvailability } from "@/lib/youtubeAvailability";
import { getVideoStatusSync } from "@/lib/videoAvailability";
import { isAllowedYouTubeVideo } from "@/lib/videoCuration";

type VideoOrigin = "channel" | "trailer";

type VideoRow = {
  id: string;
  external_id: string | null;
  title: string;
  thumbnail_url: string | null;
  video_url: string;
  published_at: string | null;
  episode: string | null;
  origin: VideoOrigin;
};

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PAGE_SIZE = 24;
const TRAILER_WINDOW_SIZE = 110;
const YOUTUBE_BANNER_VIDEO = "/manga-universe-banner.mp4";

const isNew = (d?: string | null) =>
  !!d && Date.now() - new Date(d).getTime() < 7 * 24 * 60 * 60 * 1000;

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "";

const safeThumbnail = (row: VideoRow) =>
  row.thumbnail_url || (row.external_id ? ytThumb(row.external_id) : null) || siteFallbackImage(row.id, null);

const seededShuffle = <T,>(arr: T[], seed: number) => {
  const out = arr.slice();
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const ChaineYoutube = () => {
  const [channelItems, setChannelItems] = useState<VideoRow[]>([]);
  const [trailerPool, setTrailerPool] = useState<VideoRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">("horizontal");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshSeed] = useState(() => Date.now());

  // Automatic incremental sync to keep official channel updated.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const key = "lovanet.youtube.autosync.last";
        const last = Number(localStorage.getItem(key) || "0");
        if (Date.now() - last < 30 * 60 * 1000) return;
        localStorage.setItem(key, String(Date.now()));
        await fetch(`${API}/admin/sync/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: "youtube" }),
        });
        if (!cancelled) setRefreshToken((v) => v + 1);
      } catch {
        // ignore sync failures, local content remains available
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Official channel videos from synced DB with unavailable videos removed.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoaded(false);
      try {
        const { data } = await supabase
          .from("imported_videos")
          .select("external_id, title, thumbnail_url, video_url, published_at, episode")
          .eq("source", "youtube")
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(500);
        if (!alive) return;
        const mapped: VideoRow[] = (data ?? [])
          .filter((r: any) => isAllowedYouTubeVideo(r.external_id, r.title ?? ""))
          .map((r: any): VideoRow => ({
            id: r.external_id,
            external_id: r.external_id,
            title: r.title ?? "Anime Moments officiel",
            thumbnail_url: r.thumbnail_url || ytThumb(r.external_id),
            video_url: r.video_url || `https://www.youtube.com/watch?v=${r.external_id}`,
            published_at: r.published_at ?? null,
            episode: r.episode ?? null,
            origin: "channel",
          }));

        const availability = await hydrateYouTubeAvailability(mapped.map((v) => v.external_id!)).catch(() => []);
        const unavailable = new Set(availability.filter((v) => !v.available).map((v) => v.video_id));
        const live = mapped.filter((v) => {
          const id = v.external_id!;
          const status = getVideoStatusSync(id);
          return !unavailable.has(id) && status !== "unavailable" && status !== "hidden";
        });
        if (alive) setChannelItems(live);
      } catch {
        if (alive) setChannelItems([]);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshToken]);

  // Trailer pool from AniList + site datasets.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const queryGraph = `
        query ($page:Int,$perPage:Int) {
          trending: Page(page:$page, perPage:$perPage) {
            media(type: ANIME, sort: TRENDING_DESC, isAdult:false) {
              title { english romaji }
              trailer { id site }
              coverImage { large }
            }
          }
          popular: Page(page:$page, perPage:$perPage) {
            media(type: ANIME, sort: POPULARITY_DESC, isAdult:false) {
              title { english romaji }
              trailer { id site }
              coverImage { large }
            }
          }
        }`;

        const pool = new Map<string, VideoRow>();
        for (let pageNum = 1; pageNum <= 6; pageNum++) {
          const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ query: queryGraph, variables: { page: pageNum, perPage: 50 } }),
          }).then((r) => r.json()).catch(() => null);

          const buckets = [res?.data?.trending?.media ?? [], res?.data?.popular?.media ?? []];
          for (const list of buckets) {
            for (const m of list) {
              if (m?.trailer?.site?.toLowerCase() !== "youtube" || !m?.trailer?.id) continue;
              const id = String(m.trailer.id);
              if (!isAllowedYouTubeVideo(id, m?.title?.english || m?.title?.romaji || "")) continue;
              if (pool.has(id)) continue;
              const title = m?.title?.english || m?.title?.romaji || `Trailer ${id}`;
              pool.set(id, {
                id: `trailer-${id}`,
                external_id: id,
                title,
                thumbnail_url: m?.coverImage?.large || ytThumb(id),
                video_url: `https://www.youtube.com/watch?v=${id}`,
                published_at: null,
                episode: "Trailer",
                origin: "trailer",
              });
            }
          }
        }

        for (const v of fallbackVideos) {
          if (!isAllowedYouTubeVideo(v.id, v.title)) continue;
          if (pool.has(v.id)) continue;
          pool.set(v.id, {
            id: `trailer-${v.id}`,
            external_id: v.id,
            title: v.title,
            thumbnail_url: ytThumb(v.id),
            video_url: `https://www.youtube.com/watch?v=${v.id}`,
            published_at: v.date ?? null,
            episode: v.episode ?? "Trailer",
            origin: "trailer",
          });
        }

        for (const v of IMPORTED_VIDEOS.filter((x) => x.source === "youtube")) {
          if (!isAllowedYouTubeVideo(v.external_id, v.title)) continue;
          if (pool.has(v.external_id)) continue;
          pool.set(v.external_id, {
            id: `trailer-${v.external_id}`,
            external_id: v.external_id,
            title: v.title,
            thumbnail_url: v.thumbnail_url || ytThumb(v.external_id),
            video_url: v.video_url,
            published_at: v.published_at ?? null,
            episode: v.episode ?? "Trailer",
            origin: "trailer",
          });
        }

        if (alive) setTrailerPool(Array.from(pool.values()));
      } catch {
        if (alive) setTrailerPool([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fallbackChannel: VideoRow[] = useMemo(
    () =>
      [...fallbackVideos]
        .filter((v) => isAllowedYouTubeVideo(v.id, v.title))
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .map((v): VideoRow => ({
          id: v.id,
          external_id: v.id,
          title: v.title,
          thumbnail_url: ytThumb(v.id),
          video_url: `https://www.youtube.com/watch?v=${v.id}`,
          published_at: v.date ?? null,
          episode: v.episode ?? null,
          origin: "channel",
        })),
    [],
  );

  const officialList = loaded && channelItems.length > 0 ? channelItems : fallbackChannel;

  const trailerWindow = useMemo(() => {
    const officialIds = new Set(officialList.map((v) => v.external_id).filter(Boolean));
    const clean = trailerPool.filter((v) => !!v.external_id && !officialIds.has(v.external_id));
    return seededShuffle(clean, refreshSeed).slice(0, TRAILER_WINDOW_SIZE);
  }, [officialList, trailerPool, refreshSeed]);

  const mixedList = useMemo(() => {
    const merged: VideoRow[] = [];
    let i = 0;
    let j = 0;
    while (i < officialList.length || j < trailerWindow.length) {
      if (i < officialList.length) merged.push(officialList[i++]);
      if (j < trailerWindow.length) merged.push(trailerWindow[j++]);
    }
    return merged;
  }, [officialList, trailerWindow]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mixedList;
    return mixedList.filter((v) => `${v.title} ${v.episode ?? ""}`.toLowerCase().includes(q));
  }, [mixedList, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const shortList = useMemo(() => {
    const source = officialList;
    const inferred = source
      .filter((v) => /short|shorts|clip|teaser|extrait|extract|vertical/i.test(`${v.title} ${v.episode ?? ""}`))
      .slice(0, 8);
    return inferred.length ? inferred : source.slice(0, 8);
  }, [officialList]);

  const playable = filteredList.filter((v) => !!v.external_id);
  const activeVideo = playable.find((v) => v.external_id === activeId) || playable[0];
  const activeYtId = activeVideo?.external_id ?? null;
  const activeIdx = playable.findIndex((v) => v.external_id === activeYtId);
  const nextVideo = playable.length ? playable[(activeIdx + 1) % playable.length] : null;

  const pagedList = filteredList.slice(0, page * PAGE_SIZE);
  const hasMore = pagedList.length < filteredList.length;

  const play = (id: string | null) => {
    if (!id) return;
    setActiveId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <PageShell>
      <ManualSyncButton platform="youtube" label="Sync YouTube" onDone={() => setRefreshToken((v) => v + 1)} />
      <section className="container mx-auto px-4 lg:px-8 pt-6" data-testid="youtube-top-video-banner">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_28px_90px_-42px_rgba(56,189,248,0.6)] h-[260px] sm:h-[320px]">
          <video
            src={YOUTUBE_BANNER_VIDEO}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            data-bg-video
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.85)_0%,transparent_24%,transparent_76%,rgba(2,6,23,0.9)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(2,6,23,0.65)_0%,transparent_18%,transparent_82%,rgba(2,6,23,0.65)_100%)]" />
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 py-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-5 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">Chaîne officielle</p>
            <h1 className="font-display text-2xl sm:text-4xl font-black text-white">AnimeMoments · YouTube</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild className="rounded-full gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold">
              <a href="https://www.youtube.com/@animemomentsAnimeofficiel" target="_blank" rel="noopener noreferrer">
                <Youtube className="w-4 h-4" /> Ouvrir la chaîne <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
            <Button asChild variant="outline" className="rounded-full gap-2 border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100">
              <a href="/chaine-youtube/manga">
                <Film className="w-4 h-4" /> Univers Manga &amp; Anime
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-8 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px] max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par titre ou épisode…"
              className="h-11 rounded-full pl-10 pr-10 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 font-semibold text-cyan-100">Catalogue: 6 officielles · 110 trailers</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200">{officialList.length} officielles</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200">{trailerWindow.length} trailers alternatifs</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-200">{filteredList.length} visibles</span>
          </div>
        </div>
      </section>

      {activeYtId && (
        <section className="container mx-auto px-4 lg:px-8 pb-10">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(7,12,24,0.97),rgba(10,14,28,0.88))] p-5 sm:p-6 shadow-[0_36px_120px_-40px_rgba(56,189,248,0.5)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
                  <Youtube className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/70">Dashboard · Chaîne officielle</p>
                  <p className="text-sm font-semibold text-white truncate max-w-[55vw]">{activeVideo?.title}</p>
                </div>
              </div>
              <div className="inline-flex p-1 rounded-full bg-secondary border border-border">
                <button
                  onClick={() => setOrientation("horizontal")}
                  className={cn("px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors", orientation === "horizontal" ? "bg-background text-foreground" : "text-muted-foreground")}
                >
                  ▭ Horizontal
                </button>
                <button
                  onClick={() => setOrientation("vertical")}
                  className={cn("px-3.5 py-1.5 text-xs rounded-full font-semibold transition-colors", orientation === "vertical" ? "bg-background text-foreground" : "text-muted-foreground")}
                >
                  ▯ Vertical
                </button>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="flex flex-col gap-4">
                <div className={cn(
                  "rgb-frame rounded-3xl overflow-hidden bg-black border border-border shadow-[0_40px_120px_-40px_hsl(var(--neon-magenta)/0.35)]",
                  orientation === "horizontal" ? "aspect-video w-full" : "aspect-[9/16] max-w-sm mx-auto"
                )}>
                  <ResilientVideoFrame
                    videoId={activeYtId}
                    title={activeVideo?.title || "YouTube"}
                    seed={`yt-main-${activeYtId}`}
                    searchQuery={`${activeVideo?.title || "anime moments"} anime officiel`}
                    poster={siteFallbackImage(activeYtId, activeVideo?.thumbnail_url)}
                    autoplay
                    muted={muted}
                    hideControls={false}
                    className="relative h-full w-full"
                    fallbackBadge="Vidéo de secours"
                    fallbackDescription="Vidéo YouTube indisponible — remplacement local utilisé."
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setMuted((m) => !m)}
                    className="px-3.5 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 hover:border-cyan-400/60 transition-colors flex items-center gap-1.5"
                  >
                    {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {muted ? "Activer le son" : "Couper le son"}
                  </button>
                  {nextVideo && (
                    <button
                      onClick={() => play(nextVideo.external_id)}
                      className="px-3.5 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 hover:border-cyan-400/60 transition-colors flex items-center gap-1.5"
                    >
                      Suivant <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Link
                    to={`/lecteurs-video?video=${activeYtId}`}
                    className="px-3.5 py-2 rounded-full text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1.5"
                  >
                    Plein écran <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/70">Shorts & sélection</p>
                    <h3 className="mt-0.5 text-base font-bold text-white">Vidéos officielles</h3>
                  </div>
                  <Sparkles className="w-5 h-5 text-cyan-300 flex-shrink-0" />
                </div>
                <div className="flex flex-col gap-2.5 max-h-[560px] overflow-y-auto pr-1">
                  {shortList.map((v) => {
                    const isSelected = v.external_id === activeYtId;
                    const thumb = safeThumbnail(v);
                    return (
                      <button
                        key={v.id}
                        onClick={() => play(v.external_id)}
                        className={cn(
                          "w-full text-left rounded-2xl overflow-hidden border transition-all",
                          isSelected ? "border-cyan-300/70 bg-cyan-400/10" : "border-white/10 bg-black/20 hover:border-cyan-300/40 hover:bg-white/5"
                        )}
                      >
                        <div className="flex gap-3 p-3">
                          <div className="relative h-[72px] w-[108px] flex-shrink-0 overflow-hidden rounded-xl bg-black">
                            {thumb && (
                              <img
                                src={thumb}
                                alt={v.title}
                                loading="lazy"
                                className="h-full w-full object-cover"
                                onError={createImageFallbackHandler(v.external_id || v.id, null)}
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/60">Officiel</p>
                            <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-white leading-snug">{v.title}</p>
                            {v.published_at && <p className="mt-1 text-[10px] text-slate-500">{fmt(v.published_at)}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 lg:px-8 pb-20">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Catalogue mixte intelligent</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-0.5">
              Chaîne + trailers
              <span className="ml-2 text-muted-foreground font-normal text-lg">· {filteredList.length}</span>
            </h2>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            Aucune vidéo ne correspond à « {query} ».
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {pagedList.map((v) => {
                const cover = safeThumbnail(v);
                const fresh = isNew(v.published_at);
                const isActive = v.external_id === activeYtId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => play(v.external_id)}
                    className={cn(
                      "group text-left rounded-2xl overflow-hidden bg-card border border-border transition-all hover:-translate-y-0.5 hover:border-cyan-400/50 hover:shadow-[0_20px_50px_-20px_rgba(34,211,238,0.4)]",
                      isActive && "ring-2 ring-cyan-400/70 border-cyan-400/50"
                    )}
                  >
                    <div className={cn("relative overflow-hidden bg-black", orientation === "vertical" ? "aspect-[9/16]" : "aspect-video")}>
                      {cover ? (
                        <img
                          src={cover}
                          alt={v.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={createImageFallbackHandler(v.external_id || v.id, null)}
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 flex items-center justify-center">
                          <Youtube className="w-8 h-8 text-white/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="w-11 h-11 rounded-full bg-white/90 text-black flex items-center justify-center shadow-xl">
                          <Play className="w-5 h-5 ml-0.5" />
                        </span>
                      </span>
                      {v.origin === "channel" && (
                        <span className="absolute top-2 left-2 z-20">
                          <AdminRemoveVideo
                            rowId={v.id}
                            source="youtube"
                            externalId={v.external_id}
                            onRemoved={() => setChannelItems((arr) => arr.filter((x) => x.id !== v.id))}
                          />
                        </span>
                      )}
                      <span className={cn(
                        "absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider",
                        v.origin === "channel" ? "bg-gradient-to-r from-cyan-500 to-indigo-500" : "bg-gradient-to-r from-fuchsia-500 to-violet-500"
                      )}>
                        {v.origin === "channel" ? "Officiel" : "Trailer"}
                      </span>
                      {fresh && v.origin === "channel" && (
                        <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/85 text-white text-[10px] font-bold uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" /> Nouveau
                        </span>
                      )}
                      {v.episode && (
                        <span className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-white text-[10px] font-semibold">
                          {v.episode}
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-cyan-200 transition-colors min-h-[2.5rem]">
                        {v.title}
                      </h3>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        {v.published_at ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {fmt(v.published_at)}
                          </span>
                        ) : <span />}
                        <Link
                          to={`/lecteurs-video?video=${v.external_id || v.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 transition-colors"
                        >
                          Plein écran <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full border border-cyan-400/40 text-cyan-200 text-sm font-semibold bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-300/60 transition-all shadow-[0_16px_40px_-20px_rgba(34,211,238,0.4)]"
                >
                  Charger plus <ChevronDown className="w-4 h-4" />
                  <span className="text-xs text-slate-400">({pagedList.length}/{filteredList.length})</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
};

export default ChaineYoutube;
