# Video References Report - frontend/src Directory

## Summary
- **Total files with video references**: 27
- **Video file paths found**: 13
- **Video components**: Multiple (HeroCarousel, MangaUniverseBanner, TopVideoBanner, GDriveCinematicBanner, etc.)
- **Conditional rendering for videos**: Yes (via PerformanceContext)
- **Video player pages**: LecteursVideo, Leaderboard, AnimeCatalog

---

## 1. VIDEO FILE PATHS & EXTENSIONS

### All .mp4 Video References (13 unique files)

| File Path | Used In | Purpose |
|-----------|---------|---------|
| `/catalogue-banner.mp4` | Multiple pages | Catalog banner, LecteursVideo fallback |
| `/leaderboard-banner.mp4` | Leaderboard, LecteursVideo | Leaderboard page top banner |
| `/manga-universe-banner.mp4` | MangaUniverseBanner, ChaineYoutube, LecteursVideo | Manga/manga universe banner |
| `/custom_video_lovanet.mp4` | Multiple banners, LecteursVideo | Custom Lovanet branded content |
| `/banner-seq-2.mp4` | ShopBanners, mediaFallback | Shop banner sequence 2 |
| `/banner-seq-3.mp4` | ShopBanners, mediaFallback | Shop banner sequence 3 |
| `/root-capture-video-latest.mp4` | ShopBanners, mediaFallback | Root capture latest version |
| `/capture-deck-user-video.mp4` | mediaFallback | User capture deck video |
| `/custom-hero-banner-web.mp4` | RootLandingPage | Hero banner web version |
| `/custom-hero-banner-mobile.mp4` | RootLandingPage | Hero banner mobile version |
| `/global-bg-web.mp4` | PremiumBorders.js | Global web background video |
| `/global-bg-mobile.mp4` | PremiumBorders.js | Global mobile background video |
| `/actualites-banner-2.mp4` | Tiktok | Actualités banner for TikTok page |

---

## 2. VIDEO FILE DECLARATIONS

### Module Declaration
**File:** [frontend/src/custom.d.ts](frontend/src/custom.d.ts)
```typescript
declare module "*.mp4" {
  const src: string;
  export default src;
}
```

**File:** [frontend/src/react-app-env.d.ts](frontend/src/react-app-env.d.ts)  
Line 2: Same module declaration

---

## 3. VIDEO FALLBACK SYSTEM

**File:** [frontend/src/lib/mediaFallback.ts](frontend/src/lib/mediaFallback.ts#L1-L35)

```typescript
const LOCAL_VIDEO_FALLBACKS = [
  "/custom_video_lovanet.mp4",           // Line 4
  "/root-capture-video-latest.mp4",      // Line 5
  "/banner-seq-2.mp4",                   // Line 6
  "/banner-seq-3.mp4",                   // Line 7
  "/capture-deck-user-video.mp4",        // Line 8
];

export function siteFallbackVideo(seed: string) {
  const index = hashString(seed || "lovanet-video") % LOCAL_VIDEO_FALLBACKS.length;
  return LOCAL_VIDEO_FALLBACKS[index];
}
```

**Purpose:** Provides deterministic video fallbacks for failed video loads

---

## 4. PERFORMANCE CONTEXT - VIDEO DISABLE LOGIC

**File:** [frontend/src/contexts/PerformanceContext.tsx](frontend/src/contexts/PerformanceContext.tsx#L1-L100)

### Context Setup
```typescript
const VIDEO_PREF_KEY = "site_disable_videos";                    // Line 3
const VIDEO_PREF_MANUAL_KEY = "site_disable_videos_manual";      // Line 4

interface PerformanceContextType {
  disableAnimations: boolean;
  disableVideos: boolean;                                         // Line 9
  toggleAnimations: () => void;
  toggleVideos: () => void;                                       // Line 11
  isMobile: boolean;
}
```

### Video Disable Flag On Body
```typescript
// Line 73 - Resume videos when re-enabled
const nodes = document.querySelectorAll("video[data-bg-video], video.hero-banner-video");
nodes.forEach((node) => {
  const video = node as HTMLVideoElement;
  video.muted = true;
  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
});
```

### Storage Keys
- **`site_disable_videos`** - Persisted video disable preference
- **`site_disable_videos_manual`** - Flag that user explicitly set the preference

---

## 5. CSS SELECTORS FOR VIDEO HIDING

**File:** [frontend/src/index.css](frontend/src/index.css#L15-L18)

```css
body[data-hide-videos] video[data-bg-video],
body[data-hide-videos] .hero-banner-video,
body[data-hide-videos] video.hero-banner-video {
  display: none !important;
}
```

**Mechanism:** When `data-hide-videos` attribute is set on `<body>`, all videos with `data-bg-video` class are hidden via CSS.

---

## 6. SHOP BANNERS VIDEO CONFIGURATION

**File:** [frontend/src/data/shopBanners.ts](frontend/src/data/shopBanners.ts#L1-L50)

```typescript
export type BannerVideoSlide = {
  src: string;              // Path to local .mp4 file in /public
  poster?: string;          // Fallback image during video load
  title: string;
  subtitle: string;
  badge?: string;
};

export const BANNER_VIDEO_SLIDES: BannerVideoSlide[] = [
  {
    src: "/banner-seq-2.mp4",                           // Line 24
    title: "Anime Moments · Drop TikTok viral",
    subtitle: "Séries inspirées des edits TikTok — livraison sous 3–7j",
    badge: "Vidéo · Anime Moments",
  },
  {
    src: "/banner-seq-3.mp4",                           // Line 30
    title: "Édition YouTube Officielle",
    subtitle: "Merch officiel de la chaîne · éditions numérotées",
    badge: "Vidéo · Chaîne officielle",
  },
  {
    src: "/root-capture-video-latest.mp4",              // Line 36
    title: "Neo Sakura · Bannière Ciné 4K",
    subtitle: "Trailers anime remasterisés 4K — collector édition limitée numérotée",
    badge: "Vidéo · Édition Ciné",
  },
  {
    src: "/custom_video_lovanet.mp4",                   // Line 42
    title: "Lovanet Zone · Capsule Collector",
    subtitle: "Pièces exclusives de l'univers Lovanet — série limitée maison",
    badge: "Vidéo · Univers Lovanet",
  },
];
```

---

## 7. LEADERBOARD PAGE

**File:** [frontend/src/pages/Leaderboard.tsx](frontend/src/pages/Leaderboard.tsx#L1-L50)

```typescript
const LEADERBOARD_TOP_VIDEO = "/leaderboard-banner.mp4";     // Line 8
```

**Usage:** Top banner video displayed on the Leaderboard page

---

## 8. LECTEURS VIDEO PAGE (VIDEO PLAYER PAGE)

**File:** [frontend/src/pages/LecteursVideo.tsx](frontend/src/pages/LecteursVideo.tsx#L1-L100)

### Local Clips Configuration
```typescript
type LocalClip = {
  id: string;
  title: string;
  src: string;              // Video file path
  poster: string;           // Poster/thumbnail image
  vibe: "cinema" | "concert" | "night-city";
  note: string;
};

const LOCAL_CLIPS: LocalClip[] = [
  {
    id: "studio-cinema",
    title: "Studio Cinema Atmosphere",
    src: "/catalogue-banner.mp4",                        // Line 26
    poster: crystalCity.url,
    vibe: "cinema",
    note: "Projection panoramique",
  },
  {
    id: "concert-visual",
    title: "Concert Lights Motion",
    src: "/leaderboard-banner.mp4",                      // Line 34
    poster: blingBling.url,
    vibe: "concert",
    note: "Stage lumineux en mouvement",
  },
  {
    id: "city-main",
    title: "Neon City Performance",
    src: "/manga-universe-banner.mp4",                   // Line 42
    poster: lovanetLogo.url,
    vibe: "night-city",
    note: "Ambiance urbaine premium",
  },
  {
    id: "collector-cut",
    title: "Collector Cut Showcase",
    src: "/custom_video_lovanet.mp4",                    // Line 50
    poster: crystalCity.url,
    vibe: "cinema",
    note: "Cut exclusif local",
  },
];
```

### Ferry Elements With Video Previews
```typescript
const FERRY_SELECTED_ELEMENTS = [
  { id: 1, label: "Ferry principal", previewSrc: "/leaderboard-banner.mp4", previewPoster: crystalCity.url },      // Line 79
  { id: 5, label: "Coastal city", previewSrc: "/manga-universe-banner.mp4", previewPoster: blingBling.url },      // Line 80
  { id: 15, label: "Marina building", previewSrc: "/catalogue-banner.mp4", previewPoster: lovanetLogo.url },       // Line 81
  { id: 16, label: "Luxury yachts", previewSrc: "/custom_video_lovanet.mp4", previewPoster: crystalCity.url },     // Line 82
  { id: 19, label: "Mega cruise yacht", previewSrc: "/leaderboard-banner.mp4", previewPoster: blingBling.url },    // Line 83
  { id: 23, label: "Cargo ports", previewSrc: "/catalogue-banner.mp4", previewPoster: crystalCity.url },           // Line 84
  { id: 24, label: "Tropical island", previewSrc: "/manga-universe-banner.mp4", previewPoster: lovanetLogo.url },  // Line 85
];

const TRAIN_SELECTED_ELEMENTS = [
  { id: 6, label: "Animated TGV", previewSrc: "/catalogue-banner.mp4", previewPoster: blingBling.url },            // Line 89
  { id: 13, label: "Premium plaza life", previewSrc: "/custom_video_lovanet.mp4", previewPoster: crystalCity.url },// Line 90
];
```

---

## 9. ANIME CATALOG PAGE - VIDEO PLAYER LOGIC

**File:** [frontend/src/pages/AnimeCatalog.tsx](frontend/src/pages/AnimeCatalog.tsx#L1-L100)

### Top Banner Video
```typescript
const CATALOG_TOP_VIDEO = "/catalogue-banner.mp4";        // Line 1
```

### Player Mode Definition
```typescript
type PlayerMode = "video" | "fallback" | "hidden";        // Line 62
```

### Video Availability Functions
```typescript
import { warmVideoAvailability, getVideoStatusSync, setVideoStatus } from "@/lib/videoAvailability";  // Line 42

function hasPlayableVideo(media: Media | null | undefined) {
  return Boolean(hasTrailer(media) || mediaTitle(media).trim());  // Line 96
}
```

### Video Playback Detection
```typescript
const [playerMode, setPlayerMode] = useState<PlayerMode>("video");    // Line 191
const [showVideoPrompt, setShowVideoPrompt] = useState(true);         // Line 218

useEffect(() => {
  warmVideoAvailability().finally(() => setAvailabilityReady(true)); // Line 228
}, []);
```

### Featured Rails
```typescript
const featuredRail = useMemo(() => items.filter((media) => hasPlayableVideo(media)).slice(0, 8), [items]);  // Line 526
const videoSuggestionItems = useMemo(() => filteredSorted.filter((media) => hasPlayableVideo(media)).slice(0, 10), [filteredSorted]);  // Line 557
```

---

## 10. FOOTER VIDEO COMPONENT

**File:** [frontend/src/components/Footer.tsx](frontend/src/components/Footer.tsx#L1-L50)

### Import Local Video Asset
```typescript
import footerLovanetZoneVideo from "@/assets/footer-lovanet-zone-video.mp4";  // Line 4
```

### Video Element
```typescript
<video
  className="h-[250px] w-full object-cover object-center scale-[1.01]"
  src={footerLovanetZoneVideo}
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  data-testid="footer-lovanet-video"
  data-bg-video                                    // Data attribute for conditional hiding
/>
```

**Purpose:** Full-width cinematic banner in footer with gradient overlay and shimmer animation

---

## 11. HERO CAROUSEL COMPONENT

**File:** [frontend/src/components/HeroCarousel.tsx](frontend/src/components/HeroCarousel.tsx#L510-L550)

### Imported Videos Integration
```typescript
const [allVideos, setAllVideos] = useState<WheelVideo[]>(() =>
  videos.map((v) => ({
    id: v.id,
    title: v.title,
    thumb: ytThumb(v.id),
    source: "youtube" as const,
    url: `https://www.youtube.com/watch?v=${v.id}`,
  })),
);
```

### Dynamic Video Loading
```typescript
useEffect(() => {
  let cancelled = false;
  (async () => {
    const data = IMPORTED_VIDEOS.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, 160);
    if (cancelled || !data?.length) return;
    const mapped: WheelVideo[] = data
      .map((r: any) => ({
        id: r.external_id,
        title: r.title ?? "Anime Moment",
        thumb: r.thumbnail_url || (r.source === "youtube" ? ytThumb(r.external_id) : ""),
        source: (r.source as WheelVideo["source"]) ?? "youtube",
        url: r.video_url ?? undefined,
      }))
      .filter((v: any) => Boolean(v.id));
    const unique = Array.from(new Map(mapped.map((v: any) => [v.id, v])).values());
    setAllVideos(unique.slice(0, constrainedRef.current ? 48 : 96));
  })();
  return () => { cancelled = true; };
}, []);
```

---

## 12. PREMIUM BORDERS BACKGROUND VIDEO

**File:** [frontend/src/components/PremiumBorders.js](frontend/src/components/PremiumBorders.js#L90-L110)

### Responsive Video Sources
```typescript
<video
  preload="auto"
  decoding="async"
  disablePictureInPicture
  className="absolute inset-0 w-full h-full object-cover z-[-1] opacity-60"
  style={{ pointerEvents: 'none' }}
  poster="/global-bg-poster.jpg"
  data-bg-video
>
  <source src="/global-bg-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />  // Line 98
  <source src="/global-bg-web.mp4" type="video/mp4" />                                // Line 99
</video>
```

**Purpose:** Global background video with responsive sources for mobile vs desktop

---

## 13. MANGA UNIVERSE BANNER COMPONENT

**File:** [frontend/src/components/MangaUniverseBanner.tsx](frontend/src/components/MangaUniverseBanner.tsx#L1-L50)

### Default Video
```typescript
const DEFAULT_MANGA_UNIVERSE_VIDEO = "/manga-universe-banner.mp4";  // Line 8
```

### Video Mode & Rotation
```typescript
type BgMode = "image" | "color" | "media" | "video";           // Line 6
const [bgMode, setBgMode] = useState<BgMode>("video");          // Line 13
const [videoIdx, setVideoIdx] = useState(0);                    // Line 19

useEffect(() => {
  if (!hasVideos) return;
  // Rotate through the provided videos every ~14s for a lively banner.
  const id = window.setInterval(() => {
    setVideoIdx((i) => (i + 1) % (videoIds?.length || 1));
  }, 14000);                                                    // Line 26-28
  return () => window.clearInterval(id);
}, [hasVideos, videoIds?.length]);
```

### Conditional Video Rendering
```typescript
{bgMode === "video" && (
  <div className="relative w-full h-56 sm:h-72 md:h-80 lg:h-96 overflow-hidden bg-black">
    {(hasVideos && videoIds?.length) ? (
      // Render provided videos with rotation
    ) : (
      // Render default video
    )}
  </div>
)}
```

---

## 14. ACTUALITES (NEWS) PAGE - EMBED VIDEO

**File:** [frontend/src/pages/Actualites.tsx](frontend/src/pages/Actualites.tsx#L40-L350)

### Imported Banner Video
```typescript
const ACTUALITES_BANNER_VIDEO = "https://drive.google.com/uc?export=download&id=1Rf2nvttvwP8pLXhgT5pU8vFkPwkwy92N";  // Line 40
```

### Article Type With Video Support
```typescript
type Article = {
  // ... other fields
  embed_video?: string;                                          // Line 70
};
```

### Conditional Video Embed
```typescript
{item.embed_video ? (
  <iframe
    src={buildYouTubeEmbedUrl(item.embed_video, { autoplay: true, muted: true, controls: false, loop: true, playlist: item.embed_video, playsInline: true })}
    title={item.title}
    className="absolute inset-0 h-full w-full"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
  />
) : (
  <img src={displayImage(item.image)} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
)}                                                               // Lines 309-319
```

**Purpose:** News articles can display either embedded YouTube videos or fallback to images

---

## 15. CHAINE YOUTUBE PAGE

**File:** [frontend/src/pages/ChaineYoutube.tsx](frontend/src/pages/ChaineYoutube.tsx#L48-L100)

### Top Banner Video
```typescript
const YOUTUBE_BANNER_VIDEO = "/manga-universe-banner.mp4";     // Line 48
```

### Video Row Structure
```typescript
type VideoRow = {
  id: string;
  title: string;
  thumbnail_url?: string | null;
  video_url: string;                                           // Line 39
  origin: VideoOrigin;
};
```

### Video List State
```typescript
const [channelItems, setChannelItems] = useState<VideoRow[]>([]);  // Line 74
const [trailerPool, setTrailerPool] = useState<VideoRow[]>([]);    // Line 75
```

---

## 16. ROOT LANDING PAGE

**File:** [frontend/src/pages/RootLandingPage.js](frontend/src/pages/RootLandingPage.js#L100-L160)

### Default Home Banners
```typescript
const DEFAULT_HOME_BANNERS = [
  { id: "b1", src: "/custom-hero-banner-web.mp4", label: "Bannière hero (haut)" },  // Line 103
  // ... more banners
];                                                              // Lines 102-106
```

### Banner State Persistence
```typescript
const BANNER_STATE_KEY = "lovanet.home.banners.v2";             // Line 107
```

### Responsive Hero Banner
```typescript
<source src="/custom-hero-banner-mobile.mp4" type="video/mp4" media="(max-width: 768px)" />  // Line 357
```

---

## 17. TIKTOK PAGE

**File:** [frontend/src/pages/Tiktok.tsx](frontend/src/pages/Tiktok.tsx#L24-L100)

### Banner Video
```typescript
const TIKTOK_BANNER_VIDEO = "/actualites-banner-2.mp4";       // Line 24
```

### TikTok Video Type
```typescript
type VideoListItem = {
  videoUrl: string;                                           // Line 18
};
```

### API Video Fetch
```typescript
const response = await fetch(`${API}/videos?platform=tiktok&channel_title=${encodeURIComponent(TIKTOK_HANDLE)}&strict=true&limit=80`);  // Line 48
```

---

## 18. ANIME CATALOG PAGE

**File:** [frontend/src/pages/AnimeCatalog.tsx](frontend/src/pages/AnimeCatalog.tsx#L1)

### Top Banner
```typescript
const CATALOG_TOP_VIDEO = "/catalogue-banner.mp4";            // Line 1
```

---

## 19. CONDITIONAL ANIMATION RENDERING

**File:** [frontend/src/service-worker.ts](frontend/src/service-worker.ts#L33)

### Video Request Handling
```typescript
({ request }) => request.destination === 'video' || request.destination === 'audio',  // Line 33
```

**Purpose:** Service worker caching strategy for video and audio streams

---

## 20. SEO AND VIDEO CATEGORIZATION

**File:** [frontend/src/data/seoNews.ts](frontend/src/data/seoNews.ts)

### Video Categories in SEO Data
Multiple news items have `"category": "video"` with example:
```json
{
  "id": "video-attack-on-titan-1",
  "slug": "video-attack-on-titan-1",
  "url": "https://lovanet.fr/actualites/video-attack-on-titan-1",
  "category": "video",
  "tags": ["video anime"]
}
```

---

## 21. I18N ROUTES FOR VIDEO PAGES

**File:** [frontend/src/lib/seoI18n.ts](frontend/src/lib/seoI18n.ts#L17-L60)

### Video-Related Routes
```typescript
| "/lecteurs-video"        // Line 17
| "/prime-video"           // Line 18
```

### SEO Descriptions
```typescript
"/lecteurs-video": "Lecteur vidéo Lovanet : lecture locale, modules 3D et navigation premium des contenus vidéo.",  // Line 57
"/prime-video": "Prime Video Anime.Moments.officiel : sélection d'anime, lecture continue et recommandations par univers.",  // Line 58
```

---

## 22. VIDEO AVAILABILITY TRACKING

**File:** [frontend/src/lib/videoAvailability.ts](frontend/src/lib/videoAvailability.ts#L1-L10)

```typescript
// Prevents retrying YouTube videos we already know are broken (region-locked, removed)
export type VideoAvailability = "ok" | "unavailable" | "hidden";  // Line 6

export function getVideoStatusSync(videoId: string): VideoAvailability
export function setVideoStatus(videoId: string, status: VideoAvailability): void
export function warmVideoAvailability(): Promise<void>
```

**Purpose:** Tracks availability of YouTube videos to avoid retry loops on broken content

---

## 23. YOUTUBE EMBED UTILITY

**File:** [frontend/src/lib/youtubeEmbed.ts](frontend/src/lib/youtubeEmbed.ts#L1-L30)

```typescript
function buildYouTubeEmbedUrl(
  videoId: string,
  options?: { ... }
): string {
  const base = `https://www.${nocookie ? "youtube-nocookie.com" : "youtube.com"}/embed/${videoId}`;  // Line 31
  // ... build URL with parameters
}
```

**Purpose:** Constructs privacy-respecting YouTube embed URLs with autoplay, mute, and loop parameters

---

## SUMMARY TABLE

| Component/Page | Video File | Line # | Purpose |
|---|---|---|---|
| **Layout** | - | - | - |
| Footer | `footer-lovanet-zone-video.mp4` | Footer.tsx:4 | Footer cinematic banner |
| PremiumBorders | `/global-bg-web.mp4`, `/global-bg-mobile.mp4` | PremiumBorders.js:98-99 | Global BG video (responsive) |
| **Pages** | - | - | - |
| Leaderboard | `/leaderboard-banner.mp4` | Leaderboard.tsx:8 | Top banner |
| LecteursVideo | Multiple local clips | LecteursVideo.tsx:26-50 | Video player page with 3D scenes |
| AnimeCatalog | `/catalogue-banner.mp4` | AnimeCatalog.tsx:1 | Catalog banner |
| ChaineYoutube | `/manga-universe-banner.mp4` | ChaineYoutube.tsx:48 | YouTube channel banner |
| Actualites | Drive URL (external) | Actualites.tsx:40 | News banner |
| Tiktok | `/actualites-banner-2.mp4` | Tiktok.tsx:24 | TikTok banner |
| RootLandingPage | `/custom-hero-banner-*` | RootLandingPage.js:103-357 | Home hero banner (responsive) |
| **Components** | - | - | - |
| HeroCarousel | Imported YouTube + local | HeroCarousel.tsx:510+ | Video wheel carousel |
| MangaUniverseBanner | `/manga-universe-banner.mp4` | MangaUniverseBanner.tsx:8 | Manga universe promotional banner |
| ShopHeroBanner | `/banner-seq-*.mp4` | ShopBanners.ts:24,30,36,42 | Shop carousel banners |
| **Utilities** | - | - | - |
| mediaFallback | 5 fallback videos | mediaFallback.ts:3-8 | Deterministic video fallbacks |
| PerformanceContext | `site_disable_videos` | PerformanceContext.tsx:3 | Video disable toggle logic |
| CSS | `data-hide-videos` | index.css:15-18 | Hide videos via CSS attribute |

---

## KEY PATTERNS

### 1. **Video Disabling via Performance Context**
- Users can disable videos via `usePerformance().toggleVideos()`
- Flag stored in localStorage: `site_disable_videos`
- CSS class on `<body data-hide-videos>` hides all `[data-bg-video]` elements
- Videos resume auto-play when re-enabled

### 2. **Banner Video Pattern**
- Banner videos use `<video>` with `autoPlay`, `muted`, `loop`, `playsInline`
- `preload="auto"` for faster loading
- Often include `data-bg-video` for visibility control
- Responsive sources via `<source media="(max-width: 768px)">`

### 3. **Video Fallback System**
- 5 local fallbacks defined in `mediaFallback.ts`
- Hash-based deterministic selection via `siteFallbackVideo(seed)`
- Used when primary videos fail to load

### 4. **YouTube Embed Pattern**
- Uses privacy-respecting `youtube-nocookie.com` domain
- Autoplay disabled by browser unless muted
- Conditional rendering: YouTube embed OR static image

### 5. **Video Availability Tracking**
- Tracks YouTube video status (ok/unavailable/hidden)
- Prevents retry loops on region-locked or removed content
- `warmVideoAvailability()` pre-fetches availability status

### 6. **Responsive Video Handling**
- Different video files for mobile vs desktop (`.mp4` naming convention)
- `media` attribute on `<source>` tags for responsive delivery
- Container queries and screen-dependent rendering

---

## BUILD-TIME/RUNTIME CONDITIONS

### Runtime Conditions:
1. **`disableVideos`** from PerformanceContext → hides via `body[data-hide-videos]`
2. **Mobile device detection** → constrains carousel, reduces video count
3. **Video availability** → switches from `playerMode="video"` to `"fallback"` or `"hidden"`
4. **User preference** → localStorage persists video enable/disable across sessions
5. **Reduced motion preference** → `prefers-reduced-motion` media query affects animation speeds

### Build-Time Conditions:
1. **Module resolution** → `*.mp4` files resolved via custom TypeScript declarations
2. **Import statements** → Video files in `/public` imported as module paths
3. **Public path resolution** → Videos in `/public` served at root (`/filename.mp4`)

---

## FILES WITH VIDEO USAGE BY FREQUENCY

| Files | Count |
|-------|-------|
| Pages | 7 files (LecteursVideo, Leaderboard, AnimeCatalog, ChaineYoutube, Actualites, Tiktok, RootLandingPage) |
| Components | 5 files (Footer, HeroCarousel, MangaUniverseBanner, PremiumBorders, ShopHeroBanner) |
| Data/Config | 2 files (shopBanners.ts, seoNews.ts, importedVideos.ts) |
| Utilities | 5 files (mediaFallback.ts, videoAvailability.ts, youtubeEmbed.ts, PerformanceContext.tsx) |
| Styles | 1 file (index.css) |
| Config | 2 files (custom.d.ts, react-app-env.d.ts) |
| **Total** | **22 files** |

