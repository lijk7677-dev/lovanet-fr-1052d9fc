export type YouTubeQualityPreference = "highres" | "hd1080" | "hd720" | "large" | "medium" | "small";

export function buildYouTubeEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    muted?: boolean;
    controls?: boolean;
    loop?: boolean;
    playlist?: string;
    playsInline?: boolean;
    searchQuery?: string;
    captionLang?: string;
    quality?: YouTubeQualityPreference;
    nocookie?: boolean;
  } = {},
) {
  const {
    autoplay = true,
    muted = true,
    controls = false,
    loop = false,
    playlist,
    playsInline = true,
    searchQuery,
    captionLang,
    quality = "highres",
    nocookie = true,
  } = options;

  const base = `https://www.${nocookie ? "youtube-nocookie.com" : "youtube.com"}/embed/${videoId}`;
  const url = new URL(base);
  url.searchParams.set("autoplay", autoplay ? "1" : "0");
  url.searchParams.set("mute", muted ? "1" : "0");
  url.searchParams.set("controls", controls ? "1" : "0");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("playsinline", playsInline ? "1" : "0");
  url.searchParams.set("vq", quality);
  url.searchParams.set("enablejsapi", "1");

  if (loop) {
    url.searchParams.set("loop", "1");
    url.searchParams.set("playlist", playlist || videoId);
  }
  if (searchQuery) {
    url.searchParams.set("listType", "search");
    url.searchParams.set("list", searchQuery);
  }
  if (captionLang) {
    url.searchParams.set("cc_load_policy", "1");
    url.searchParams.set("cc_lang_pref", captionLang);
    url.searchParams.set("hl", captionLang);
  }
  return url.toString();
}

const QUALITY_ORDER: YouTubeQualityPreference[] = ["highres", "hd1080", "hd720", "large", "medium", "small"];

export function requestBestYouTubeQuality(player: any) {
  if (!player) return;
  try {
    const available: string[] = typeof player.getAvailableQualityLevels === "function" ? player.getAvailableQualityLevels() || [] : [];
    const desired = QUALITY_ORDER.find((quality) => available.includes(quality)) || "highres";
    if (typeof player.setPlaybackQuality === "function") {
      player.setPlaybackQuality(desired);
    }
  } catch {
    // ignore unsupported quality requests
  }
}