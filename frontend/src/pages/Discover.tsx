import { useEffect, useRef, useState } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { HubEmbedFrame } from "@/components/HubEmbedFrame";
import { SHOP_PRODUCTS, categoryLabel } from "@/data/shopProducts";
import { videos, thumb } from "@/data/videos";
import { ShoppingBag, Youtube, Music2, Play, Film, Calendar, Sparkles, ArrowRight } from "lucide-react";
import { ManualSyncButton } from "@/components/ManualSyncButton";

/**
 * /decouvrir — SEO landing page.
 * Purpose: give Google / Bing / image & video search a single,
 * crawlable index of everything Lovanet offers — products with real
 * <img> thumbnails, video previews with VideoObject JSON-LD, and
 * deep links to every section. No filler text.
 */
const Discover = () => {
  const [catalogSeo, setCatalogSeo] = useState<Array<{
    id: number; title: string; summary: string; year: number | null; score: number | null;
    genres: string[]; cover: string | null; banner: string | null; trailerId: string | null; url: string;
  }>>([]);

  useEffect(() => {
    // Load prebuilt catalog SEO index (up to 1500 titles with trailers, covers & synopsis)
    fetch("/catalog-seo.json").then((r) => (r.ok ? r.json() : [])).then(setCatalogSeo).catch(() => setCatalogSeo([]));
  }, []);

  useEffect(() => {
    document.title = "Univers Lovanet — Vidéos, shorts, boutique, animés";
    const meta = (name: string, value: string, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); prop ? el.setAttribute("property", name) : el.setAttribute("name", name); document.head.appendChild(el); }
      el.content = value;
    };
    meta("description", "Anime.Moments.officiel : Lovanet — la plateforme officielle dédiée à l'anime : chaîne YouTube AnimemomentsAnimeofficiel, shorts TikTok Anime.Moments.officiel, Prime Video, animés à venir, catalogue 1500+ titres et boutique collector.");
    meta("og:title", "Univers Lovanet — AnimemomentsAnimeofficiel", true);
    meta("og:url", "https://lovanet.fr/decouvrir", true);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = "https://lovanet.fr/decouvrir";
  }, []);

  const sections: Array<{
    to: string; label: string; tagline: string; desc: string; icon: any;
    grad: string; accent: string; emoji: string;
  }> = [
    { to: "/chaine-youtube", label: "AnimemomentsAnimeofficiel", tagline: "YouTube officiel", desc: "Edits, trailers & épisodes en HD", icon: Youtube, grad: "from-red-500/40 via-rose-500/20 to-transparent", accent: "#ef4444", emoji: "▶️" },
    { to: "/tiktok", label: "Anime.Moments.officiel", tagline: "TikTok · shorts viraux", desc: "Shorts verticaux, edits & moments cultes", icon: Music2, grad: "from-fuchsia-500/40 via-cyan-400/20 to-transparent", accent: "#e879f9", emoji: "🎵" },
    { to: "/prime-video", label: "Prime Video", tagline: "Séances premium", desc: "Lecture cinéma en pleine page", icon: Play, grad: "from-sky-500/40 via-blue-500/20 to-transparent", accent: "#38bdf8", emoji: "🎬" },
    { to: "/anime-countdown", label: "À venir", tagline: "Countdown live", desc: "Prochaines sorties anime en direct", icon: Calendar, grad: "from-amber-500/40 via-orange-500/20 to-transparent", accent: "#fbbf24", emoji: "⏳" },
    { to: "/anime-catalog", label: "Catalogue", tagline: "1500+ animés", desc: "Fiches, trailers, synopsis complets", icon: Sparkles, grad: "from-violet-500/40 via-indigo-500/20 to-transparent", accent: "#a78bfa", emoji: "📚" },
    { to: "/anime-moments", label: "Anime Moments", tagline: "Expérience premium", desc: "La page originale avec hologrammes et carrousel vivant", icon: Film, grad: "from-emerald-500/40 via-teal-500/20 to-transparent", accent: "#34d399", emoji: "🌌" },
    { to: "/shop", label: "Shop", tagline: "Collector officiel", desc: `${SHOP_PRODUCTS.length} pièces exclusives · édition limitée`, icon: ShoppingBag, grad: "from-pink-500/40 via-rose-500/20 to-transparent", accent: "#f472b6", emoji: "🛍️" },
  ];

  // Rotating hero showcase — cycles through featured video thumbnails.
  const heroVideos = videos.slice(0, 6);
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (!heroVideos.length) return;
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroVideos.length), 4200);
    return () => clearInterval(t);
  }, [heroVideos.length]);
  const heroRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Catalogue AnimemomentsAnimeofficiel",
    itemListElement: SHOP_PRODUCTS.slice(0, 76).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        description: p.description,
        image: `https://lovanet.fr/products/${p.id}.svg`,
        url: `https://lovanet.fr/shop#${p.id}`,
        brand: { "@type": "Brand", name: "AnimemomentsAnimeofficiel" },
        offers: { "@type": "Offer", price: p.price.toFixed(2), priceCurrency: "EUR", availability: "https://schema.org/InStock" },
      },
    })),
  };

  const videoLd = {
    "@context": "https://schema.org",
    "@graph": videos.map((v) => ({
      "@type": "VideoObject",
      name: v.title,
      description: `${v.series} — ${v.channel ?? "AnimemomentsAnimeofficiel"} ${v.episode ?? ""}`.trim(),
      thumbnailUrl: [thumb(v.id)],
      uploadDate: v.date ?? "2026-01-01",
      contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
      embedUrl: buildYouTubeEmbedUrl(v.id, { autoplay: false, muted: false, controls: true, playsInline: true, nocookie: false }),
    })),
  };

  // Chunk the catalog JSON-LD (1500 items) into 3 blocks so each script tag stays reasonable.
  const catalogChunks: typeof catalogSeo[] = [];
  const CHUNK = 500;
  for (let i = 0; i < catalogSeo.length; i += CHUNK) catalogChunks.push(catalogSeo.slice(i, i + CHUNK));

  const catalogItemListLd = (chunk: typeof catalogSeo, offset: number) => ({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Catalogue Lovanet — animés ${offset + 1}–${offset + chunk.length}`,
    itemListElement: chunk.map((it, i) => ({
      "@type": "ListItem",
      position: offset + i + 1,
      item: it.trailerId
        ? {
            "@type": "VideoObject",
            name: `${it.title} — Trailer officiel`,
            description: it.summary || `${it.title} — trailer et fiche complète sur Lovanet.`,
            thumbnailUrl: [it.cover, `https://i.ytimg.com/vi/${it.trailerId}/hqdefault.jpg`].filter(Boolean),
            uploadDate: it.year ? `${it.year}-01-01` : "2020-01-01",
            contentUrl: `https://www.youtube.com/watch?v=${it.trailerId}`,
            embedUrl: buildYouTubeEmbedUrl(it.trailerId, { autoplay: false, muted: false, controls: true, playsInline: true, nocookie: false }),
            genre: it.genres,
            url: it.url,
          }
        : {
            "@type": "CreativeWork",
            name: it.title,
            description: it.summary || `${it.title} — fiche complète sur Lovanet.`,
            image: [it.cover, it.banner].filter(Boolean),
            genre: it.genres,
            url: it.url,
            datePublished: it.year ? `${it.year}-01-01` : undefined,
            aggregateRating: it.score
              ? { "@type": "AggregateRating", ratingValue: (it.score / 10).toFixed(1), bestRating: "10", ratingCount: 1 }
              : undefined,
          },
    })),
  });

  return (
    <PageShell>
      <ManualSyncButton platform="all" label="Sync toutes plateformes" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoLd) }} />
      {catalogChunks.map((chunk, i) => (
        <script
          key={`catalog-ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogItemListLd(chunk, i * CHUNK)) }}
        />
      ))}

      {/* Hidden SEO index — crawlable but not shown to visitors */}
      <div className="sr-only" aria-hidden="true">
        <ul>
          {videos.map((v) => (
            <li key={`seo-v-${v.id}`} itemScope itemType="https://schema.org/VideoObject">
              <a href={`https://www.youtube.com/watch?v=${v.id}`}>
                <img src={thumb(v.id)} alt={`${v.title} — ${v.series}`} itemProp="thumbnailUrl" />
                <span itemProp="name">{v.title}</span>
                <span itemProp="description">{v.series} · {v.episode}</span>
              </a>
            </li>
          ))}
          {SHOP_PRODUCTS.map((p) => (
            <li key={`seo-p-${p.id}`} itemScope itemType="https://schema.org/Product">
              <a href={`https://lovanet.fr/shop#${p.id}`}>
                <img src={`/products/${p.id}.svg`} alt={`${p.name} — ${categoryLabel(p.category)}`} itemProp="image" />
                <span itemProp="name">{p.name}</span>
                <span itemProp="description">{p.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* HERO — animated banner */}
      <section className="relative overflow-hidden">
        <div
          ref={heroRef}
          onMouseMove={(e) => {
            const r = heroRef.current?.getBoundingClientRect();
            if (!r) return;
            const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
            setTilt({ x, y });
          }}
          onMouseLeave={() => setTilt({ x: 0, y: 0 })}
          className="relative container mx-auto px-4 pt-10 pb-16 md:pt-16 md:pb-24"
          style={{ perspective: "1400px" }}
        >
          {/* Aurora blobs */}
          <div aria-hidden className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-40 animate-pulse"
            style={{ background: "radial-gradient(circle, #e879f9 0%, transparent 60%)" }} />
          <div aria-hidden className="absolute top-10 right-0 w-[480px] h-[480px] rounded-full blur-3xl opacity-30 animate-pulse"
            style={{ background: "radial-gradient(circle, #38bdf8 0%, transparent 60%)", animationDelay: "1.5s" }} />
          <div aria-hidden className="absolute bottom-0 left-1/3 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 animate-pulse"
            style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 60%)", animationDelay: "3s" }} />

          <div className="relative flex flex-col items-center text-center">
            <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-fuchsia-400/40 text-fuchsia-300 bg-fuchsia-500/10 backdrop-blur mb-6">
                <Sparkles className="w-3 h-3" /> Univers officiel · 2026
              </span>
              <h1
                className="font-display font-black leading-[0.95] mb-5 text-4xl md:text-6xl lg:text-7xl"
                style={{
                  background: "linear-gradient(120deg, #f0abfc 0%, #67e8f9 45%, #fde68a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 6px 30px rgba(240,171,252,0.35))",
                }}
              >
                Anime.Moments.officiel<br />
                <span className="text-2xl md:text-3xl lg:text-4xl font-semibold opacity-90">: Lovanet Univers</span>
              </h1>

              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white border border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" /> Boutique
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-14 w-full" data-testid="discover-ferry-hub-anchor">
            <HubEmbedFrame
              src="/hub/ferry"
              title="Hub Ferry"
              heightClassName="h-[620px] md:h-[760px] lg:h-[840px] w-full"
              testId="discover-ferry-hub"
            />
          </div>
        </div>

        <div aria-hidden className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(240,171,252,0.5), transparent)" }} />
      </section>

      {/* SECTIONS DÉDIÉES — premium cards */}
      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6" style={{ perspective: "1200px" }}>
          {sections.map((s, i) => (
            <Link
              key={s.to}
              to={s.to}
              className="group relative rounded-3xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-7 min-h-[220px] flex flex-col justify-between transition-all duration-500 hover:-translate-y-2 hover:border-white/25"
              style={{
                transformStyle: "preserve-3d",
                boxShadow: "0 20px 60px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03) inset",
              }}
            >
              {/* animated gradient wash */}
              <div aria-hidden className={`absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${s.grad}`} />
              {/* shine sweep */}
              <div aria-hidden className="absolute -inset-x-1 -top-1 h-24 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(180deg, ${s.accent}22, transparent)` }} />
              {/* corner glyph */}
              <div aria-hidden className="absolute -bottom-8 -right-8 text-[140px] leading-none opacity-10 group-hover:opacity-25 transition-opacity select-none">
                {s.emoji}
              </div>

              <div className="relative z-10 flex items-start justify-between">
                <div
                  className="w-12 h-12 rounded-2xl grid place-items-center border border-white/15 backdrop-blur"
                  style={{ background: `${s.accent}22`, boxShadow: `0 0 24px ${s.accent}55` }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                </div>
                <span className="text-2xl" aria-hidden>{s.emoji}</span>
              </div>

              <div className="relative z-10 mt-6">
                <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: s.accent }}>
                  {s.tagline}
                </div>
                <div className="font-display text-xl md:text-2xl font-bold text-white mb-2 leading-tight break-words">
                  {s.label}
                </div>
                <div className="text-xs md:text-sm text-white/65 leading-relaxed">{s.desc}</div>
              </div>

              <div className="relative z-10 mt-5 inline-flex items-center gap-2 text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                Découvrir
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing CTA strip */}
      <section className="container mx-auto px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-8 md:p-12 text-center"
          style={{ background: "radial-gradient(ellipse at center, rgba(232,121,249,0.18), rgba(56,189,248,0.08) 60%, transparent)" }}>
          <div aria-hidden className="absolute inset-0 opacity-40"
            style={{ background: "conic-gradient(from 90deg at 50% 50%, transparent, rgba(240,171,252,0.15), transparent 40%)" }} />
          <div />
          <Link
            to="/anime-moments"
            className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white transition-transform hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #e879f9, #38bdf8)",
              boxShadow: "0 20px 40px -12px rgba(232,121,249,0.5)",
            }}
          >
            Aller vers Anime Moments <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
};

export default Discover;