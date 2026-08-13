// Lovanet API edge function: translation, news feeds, multilingual trailers.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ---------------------------------- cache --------------------------------- */
const cache = new Map<string, { at: number; value: any }>();
function getCache<T>(key: string, ttlMs: number): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  return null;
}
function setCache(key: string, value: any) {
  cache.set(key, { at: Date.now(), value });
}

const DISALLOWED_HOST_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".test",
  ".example",
  ".invalid",
];

function isIPv4(value: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
}

function parseIPv4(value: string) {
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) return null;
  return parts;
}

function isPrivateIPv4(value: string) {
  const parts = parseIPv4(value);
  if (!parts) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isIPv6(value: string) {
  return value.includes(":");
}

function isPrivateIPv6(value: string) {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isBlockedHost(hostname: string) {
  const lower = hostname.toLowerCase();
  return DISALLOWED_HOST_SUFFIXES.some((suffix) => lower === suffix || lower.endsWith(suffix));
}

async function isPrivateTarget(hostname: string) {
  if (isIPv4(hostname)) return isPrivateIPv4(hostname);
  if (isIPv6(hostname)) return isPrivateIPv6(hostname);
  if (isBlockedHost(hostname)) return true;

  if (typeof Deno.resolveDns === "function") {
    try {
      const records = await Deno.resolveDns(hostname, "A");
      if (records.some(isPrivateIPv4)) return true;
    } catch {
      // ignore DNS resolvers that fail for public names
    }
    try {
      const records = await Deno.resolveDns(hostname, "AAAA");
      if (records.some(isPrivateIPv6)) return true;
    } catch {
      // ignore DNS resolvers that fail for public names
    }
  }

  return false;
}

function getRequestSecret(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  return (
    req.headers.get("x-sync-secret") ||
    (authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null)
  );
}

async function requireSyncSecret(req: Request) {
  const secret = Deno.env.get("SYNC_SECRET");
  const headerSecret = getRequestSecret(req);
  return typeof secret === "string" && secret.length > 0 && headerSecret === secret;
}

/* ------------------------- persistent (DB) cache -------------------------- */
const CACHE_DB_URL = Deno.env.get("SUPABASE_URL");
const CACHE_DB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function readDbCache<T>(key: string): Promise<{ value: T; updatedAt: number } | null> {
  if (!CACHE_DB_URL || !CACHE_DB_KEY) return null;
  try {
    const res = await fetch(
      `${CACHE_DB_URL}/rest/v1/news_cache?key=eq.${encodeURIComponent(key)}&select=payload,updated_at`,
      { headers: { apikey: CACHE_DB_KEY, Authorization: `Bearer ${CACHE_DB_KEY}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = rows?.[0];
    if (!row?.payload) return null;
    return { value: row.payload.value as T, updatedAt: new Date(row.updated_at).getTime() };
  } catch {
    return null;
  }
}

async function writeDbCache(key: string, value: unknown) {
  if (!CACHE_DB_URL || !CACHE_DB_KEY) return;
  try {
    await fetch(`${CACHE_DB_URL}/rest/v1/news_cache?on_conflict=key`, {
      method: "POST",
      headers: {
        apikey: CACHE_DB_KEY,
        Authorization: `Bearer ${CACHE_DB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([{ key, payload: { value }, updated_at: new Date().toISOString() }]),
    });
  } catch (error) {
    console.error("db cache write failed", key, error);
  }
}

/* -------------------------------- translate ------------------------------- */
async function aiTranslateBatch(texts: string[], target: string): Promise<string[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("missing-ai-key");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            `Translate each input string into ${target}. Reply ONLY with a JSON array of translated strings, same length and order, no extra text.`,
        },
        { role: "user", content: JSON.stringify(texts) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ai-${res.status}`);
  const data = await res.json();
  const raw = String(data?.choices?.[0]?.message?.content || "");
  const match = raw.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(match ? match[0] : raw);
  if (!Array.isArray(parsed) || parsed.length !== texts.length) throw new Error("ai-shape");
  return parsed.map((value: unknown, index: number) => String(value || texts[index]));
}

async function googleTranslateApi(texts: string[], target: string): Promise<string[]> {
  const key = Deno.env.get("GOOGLE_API_KEY");
  if (!key) throw new Error("missing-google-key");
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts.map((t) => t.slice(0, 4500)), target, format: "text" }),
  });
  if (!res.ok) throw new Error(`gapi-${res.status}`);
  const data = await res.json();
  const rows = data?.data?.translations;
  if (!Array.isArray(rows) || rows.length !== texts.length) throw new Error("gapi-shape");
  return rows.map((r: any, i: number) => String(r?.translatedText || texts[i]));
}

async function translateOne(text: string, target: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=` +
    encodeURIComponent(text.slice(0, 4500));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`gtx-${res.status}`);
  const data = await res.json();
  const chunks = Array.isArray(data?.[0]) ? data[0] : [];
  const out = chunks.map((c: any) => (Array.isArray(c) ? c[0] : "")).join("");
  if (!out) throw new Error("gtx-empty");
  const detected = String(data?.[2] || "").toLowerCase();
  // Same text is a legitimate result when the source language already matches the target.
  if (out.trim() === text.trim() && detected && !detected.startsWith(target)) throw new Error("gtx-noop");
  return out;
}

async function handleTranslate(req: Request) {
  const body = await req.json().catch(() => ({}));
  const texts: string[] = Array.isArray(body?.texts) ? body.texts : body?.text ? [body.text] : [];
  const target = String(body?.target_lang || body?.target || "fr").toLowerCase();
  const clean = Array.from(new Set(texts.map((t) => String(t || "").trim()).filter(Boolean))).slice(0, 60);
  if (!clean.length) return json({ translations: [] });

  const translations: Array<{ original_text: string; translated_text: string }> = [];
  for (let i = 0; i < clean.length; i += 20) {
    const slice = clean.slice(i, i + 20);
    const pending: string[] = [];
    const uncached = slice.filter((t) => !getCache<string>(`tr:${target}:${t}`, 86_400_000));
    if (uncached.length) {
      try {
        const out = await googleTranslateApi(uncached, target);
        uncached.forEach((t, idx) => setCache(`tr:${target}:${t}`, out[idx] || t));
      } catch (error) {
        console.warn("google translate api unavailable", (error as Error)?.message);
      }
    }
    const done = await Promise.all(
      slice.map(async (text) => {
        const key = `tr:${target}:${text}`;
        const cached = getCache<string>(key, 86_400_000);
        if (cached) return { original_text: text, translated_text: cached };
        try {
          const translated = await translateOne(text, target);
          setCache(key, translated);
          return { original_text: text, translated_text: translated };
        } catch {
          pending.push(text);
          return { original_text: text, translated_text: text };
        }
      }),
    );
    if (pending.length) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const aiOut = await aiTranslateBatch(pending, target);
          pending.forEach((text, index) => {
            const translated = aiOut[index] || text;
            setCache(`tr:${target}:${text}`, translated);
            const row = done.find((entry) => entry.original_text === text);
            if (row) row.translated_text = translated;
          });
          break;
        } catch (error) {
          const retriable = /ai-(429|5\d\d|shape)/.test(String((error as Error)?.message));
          console.error("ai translate fallback failed", error);
          if (!retriable || attempt === 2) break;
          await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
        }
      }
    }
    translations.push(...done);
  }
  return json({ translations, target_lang: target });
}

/* --------------------------- multilingual trailers ------------------------ */
type TrailerHit = { id: string; title: string; source: string };

function classifyVersion(title: string, channel: string): string | null {
  const t = `${title} ${channel}`.toLowerCase();
  if (/\bvf\b|version fran|doubl(é|e) fran|french dub/.test(t)) return "vf";
  if (/vostfr|sous-titr|vost fr|bande[- ]annonce/.test(t)) return "vostfr";
  if (/english dub|dub\b|doublage anglais/.test(t)) return "endub";
  if (/english sub|eng sub|subtitled/.test(t)) return "ensub";
  if (/pv|予告|trailer|teaser|official/.test(t)) return "vo";
  return null;
}

async function ytScrapeSearch(query: string): Promise<TrailerHit[]> {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      console.error("youtube scrape http", res.status);
      return [];
    }
    const html = await res.text();
    const unescape = (value: string) =>
      value.replace(/\\u0026/g, "&").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const chunks = html.split('"videoRenderer":{"videoId":"').slice(1);
    const hits: TrailerHit[] = [];
    const seen = new Set<string>();
    for (const chunk of chunks) {
      const id = chunk.slice(0, 11);
      if (!/^[\w-]{11}$/.test(id) || seen.has(id)) continue;
      const window = chunk.slice(0, 3000);
      const title = window.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)?.[1];
      const channel =
        window.match(/"longBylineText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)?.[1] ||
        window.match(/"ownerText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)?.[1] ||
        "YouTube";
      if (!title) continue;
      seen.add(id);
      hits.push({ id, title: unescape(title), source: unescape(channel) });
      if (hits.length >= 8) break;
    }
    return hits;
  } catch (error) {
    console.error("youtube scrape failed", error);
    return [];
  }
}

async function ytApiSearch(query: string, key: string): Promise<TrailerHit[]> {
  const url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&videoEmbeddable=true&q=` +
    `${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("youtube search failed", res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = await res.json();
  return (data?.items || [])
    .map((item: any) => ({
      id: item?.id?.videoId,
      title: item?.snippet?.title || "",
      source: item?.snippet?.channelTitle || "YouTube",
    }))
    .filter((hit: TrailerHit) => Boolean(hit.id));
}

async function ytSearch(query: string, key?: string): Promise<TrailerHit[]> {
  // Prefer the official YouTube Data API (GOOGLE_API_KEY / YOUTUBE_API_KEY):
  // more reliable VO/VF/VOSTFR metadata than HTML scraping.
  if (key) {
    const api = await ytApiSearch(query, key);
    if (api.length) return api;
  }
  return await ytScrapeSearch(query);
}

async function handleMultilingualTrailers(url: URL) {
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return json({ results: {} });
  const cacheKey = `mt:${q.toLowerCase()}`;
  const cached = getCache<any>(cacheKey, 6 * 3600_000);
  if (cached) return json({ results: cached, cached: true });

  const key = Deno.env.get("YOUTUBE_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || undefined;

  const queries: Array<[string, string]> = [
    ["vostfr", `${q} bande annonce VOSTFR`],
    ["vf", `${q} bande annonce VF officielle`],
    ["vo", `${q} anime official trailer PV`],
    ["ensub", `${q} official trailer english subtitles`],
    ["endub", `${q} english dub trailer`],
  ];

  const results: Record<string, TrailerHit[]> = {};
  const searched = await Promise.all(queries.map(([code, query]) => ytSearch(query, key).then((hits) => [code, hits] as const)));
  for (const [code, hits] of searched) {
    const strict = hits.filter((hit) => classifyVersion(hit.title, hit.source) === code);
    const chosen = (strict.length ? strict : code === "vo" ? hits : []).slice(0, 4);
    if (chosen.length) results[code] = chosen;
  }
  setCache(cacheKey, results);
  return json({ results });
}

/* ----------------------------------- news --------------------------------- */
const NEWS_SOURCES = [
  { id: "anime-news-network-fr", name: "Anime News Network FR", url: "https://www.animenewsnetwork.com/all/rss.xml", categories: ["anime", "manga"], group: "Anime News Network", language: "en", site: "https://www.animenewsnetwork.com" },
  { id: "manga-news", name: "Manga News", url: "https://www.manga-news.com/index.php/rss/news", categories: ["manga", "anime"], group: "Manga News", language: "fr", site: "https://www.manga-news.com" },
  { id: "adala-news", name: "Adala News", url: "https://adala-news.fr/feed/", categories: ["anime", "manga"], group: "Adala News", language: "fr", site: "https://adala-news.fr" },
  { id: "anime-otaku", name: "Anime Otaku", url: "https://www.animeotaku.fr/feed/", categories: ["anime"], group: "Anime Otaku", language: "fr", site: "https://www.animeotaku.fr" },
  { id: "planete-jeunesse", name: "Planète Jeunesse", url: "https://www.planete-jeunesse.com/rss.xml", categories: ["anime"], group: "Planète Jeunesse", language: "fr", site: "https://www.planete-jeunesse.com" },
  { id: "nautiljon", name: "Nautiljon", url: "https://www.nautiljon.com/rss/news.xml", categories: ["anime", "manga", "pop-culture"], group: "Nautiljon", language: "fr", site: "https://www.nautiljon.com" },
  { id: "otakugame", name: "OtakuGame", url: "https://otakugame.fr/feed/", categories: ["anime", "gaming"], group: "OtakuGame", language: "fr", site: "https://otakugame.fr" },
  { id: "coyote-mag", name: "Coyote Mag", url: "https://www.coyotemag.fr/feed/", categories: ["manga", "anime"], group: "Coyote Mag", language: "fr", site: "https://www.coyotemag.fr" },
  { id: "mangamag", name: "Manga Mag", url: "https://www.mangamag.fr/feed/", categories: ["manga"], group: "Manga Mag", language: "fr", site: "https://www.mangamag.fr" },
  { id: "crunchyroll-news", name: "Crunchyroll News", url: "https://feeds.feedburner.com/crunchyroll/rss/anime", categories: ["anime", "streaming"], group: "Crunchyroll", language: "en", site: "https://www.crunchyroll.com" },
  { id: "anime-uk-news", name: "Anime UK News", url: "https://animeuknews.net/feed/", categories: ["anime", "manga"], group: "Anime UK News", language: "en", site: "https://animeuknews.net" },
  { id: "comic-book-resources-anime", name: "CBR Anime", url: "https://www.cbr.com/feed/category/anime/", categories: ["anime", "manga"], group: "CBR", language: "en", site: "https://www.cbr.com" },
  { id: "otaquest", name: "OTAQUEST", url: "https://www.otaquest.com/feed/", categories: ["anime", "pop-culture"], group: "OTAQUEST", language: "en", site: "https://www.otaquest.com" },
  { id: "kotaku-anime", name: "Kotaku", url: "https://kotaku.com/rss", categories: ["gaming", "anime"], group: "Kotaku", language: "en", site: "https://kotaku.com" },
  { id: "kotaku-anime", name: "Kotaku", url: "https://kotaku.com/rss", categories: ["gaming", "anime"], group: "Kotaku", language: "en", site: "https://kotaku.com" },
  { id: "anime-hunch", name: "Anime Hunch", url: "https://animehunch.com/feed/", categories: ["anime"], group: "Anime Hunch", language: "en", site: "https://animehunch.com" },
  { id: "anime-corner", name: "Anime Corner", url: "https://animecorner.me/feed/", categories: ["anime"], group: "Anime Corner", language: "en", site: "https://animecorner.me" },
  { id: "anime-motivation", name: "Anime Motivation", url: "https://animemotivation.com/feed/", categories: ["anime", "pop-culture"], group: "Anime Motivation", language: "en", site: "https://animemotivation.com" },
  { id: "anime-trending", name: "Anime Trending", url: "https://www.animetrending.net/feed/", categories: ["anime"], group: "Anime Trending", language: "en", site: "https://www.animetrending.net" },
  { id: "netflix-tudum", name: "Netflix Tudum", url: "https://www.netflix.com/tudum/rss", categories: ["streaming", "anime"], group: "Netflix", language: "en", site: "https://www.netflix.com" },
  { id: "millenium-jv", name: "Millenium", url: "https://www.millenium.org/rss/news.xml", categories: ["gaming"], group: "Millenium", language: "fr", site: "https://www.millenium.org" },
  { id: "gameblog", name: "Gameblog", url: "https://www.gameblog.fr/rss/news.xml", categories: ["gaming"], group: "Gameblog", language: "fr", site: "https://www.gameblog.fr" },
  { id: "ign-fr", name: "IGN France", url: "https://fr.ign.com/feed.xml", categories: ["gaming", "streaming"], group: "IGN", language: "fr", site: "https://fr.ign.com" },
  { id: "ign-en", name: "IGN", url: "https://feeds.feedburner.com/ign/all", categories: ["gaming"], group: "IGN", language: "en", site: "https://www.ign.com" },
  { id: "gamespot", name: "GameSpot", url: "https://www.gamespot.com/feeds/mashup/", categories: ["gaming"], group: "GameSpot", language: "en", site: "https://www.gamespot.com" },
  { id: "polygon", name: "Polygon", url: "https://www.polygon.com/rss/index.xml", categories: ["gaming", "anime"], group: "Polygon", language: "en", site: "https://www.polygon.com" },
  { id: "eurogamer", name: "Eurogamer", url: "https://www.eurogamer.net/feed", categories: ["gaming"], group: "Eurogamer", language: "en", site: "https://www.eurogamer.net" },
  { id: "sora-news-24", name: "SoraNews24", url: "https://soranews24.com/feed/", categories: ["pop-culture", "anime"], group: "SoraNews24", language: "en", site: "https://soranews24.com" },
  { id: "japan-info", name: "Japan Info", url: "https://jpninfo.com/feed", categories: ["pop-culture"], group: "Japan Info", language: "en", site: "https://jpninfo.com" },
  { id: "japan-info", name: "Japan Info", url: "https://jpninfo.com/feed", categories: ["pop-culture"], group: "Japan Info", language: "en", site: "https://jpninfo.com" },
  { id: "livedoor-anime", name: "Livedoor Anime News", url: "https://news.livedoor.com/topics/rss/ent.xml", categories: ["anime", "pop-culture"], group: "Livedoor", language: "ja", site: "https://news.livedoor.com" },
];

type NewsItem = Record<string, any>;

function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

function stripHtml(value: string) {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

function extractImage(block: string) {
  const media =
    block.match(/<media:(?:content|thumbnail)[^>]*url="([^"]+)"/i) ||
    block.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i) ||
    block.match(/<img[^>]*src="([^"]+)"/i) ||
    block.match(/&lt;img[^&]*src=&quot;([^&]+)&quot;/i);
  if (media) return decodeEntities(media[1]);
  const loose = decodeEntities(block).match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/i);
  return loose ? loose[0] : null;
}

/* --------------------------- og:image enrichment -------------------------- */
const OG_TTL = 7 * 24 * 3600_000;

async function fetchOgImage(link: string): Promise<string | null> {
  if (!link) return null;
  const key = `og:${link}`;
  const cached = getCache<string | null>(key, OG_TTL);
  if (cached !== null && cached !== undefined) return cached;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(link, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LovanetBot/1.0)", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
    });
    clearTimeout(timer);
    if (!res.ok) { setCache(key, ""); return null; }
    const html = (await res.text()).slice(0, 260_000);
    const found =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i)?.[1] ||
      null;
    const abs = found
      ? (() => { try { return new URL(decodeEntities(found), link).toString(); } catch { return null; } })()
      : null;
    setCache(key, abs || "");
    return abs;
  } catch {
    setCache(key, "");
    return null;
  }
}

async function enrichImages(items: NewsItem[]) {
  const missing = items.filter((item) => !item.image && item.source_path).slice(0, 60);
  const CONCURRENCY = 12;
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const slice = missing.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (item) => {
        const image = await fetchOgImage(String(item.source_path));
        if (image) item.image = image;
      }),
    );
  }
}

async function fetchFeed(source: (typeof NEWS_SOURCES)[number]): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LovanetBot/1.0)", Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
    return blocks.slice(0, 20).map((block) => {
      const title = stripHtml(tag(block, "title"));
      const linkTag = tag(block, "link");
      const link = linkTag || (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "");
      const description = stripHtml(tag(block, "description") || tag(block, "summary") || tag(block, "content:encoded"));
      const published = tag(block, "pubDate") || tag(block, "updated") || tag(block, "published");
      const publishedAt = published ? new Date(published) : new Date();
      return {
        id: `${source.id}-${slugify(title)}`,
        slug: `${source.id}-${slugify(title)}`,
        title,
        description: description.slice(0, 480),
        excerpt: description.slice(0, 220),
        content: description,
        image: extractImage(block),
        published_at: (isNaN(publishedAt.getTime()) ? new Date() : publishedAt).toISOString(),
        source_name: source.name,
        source_group: source.group,
        source_id: source.id,
        source_path: link,
        source_domain: (() => {
          try {
            return new URL(link).hostname;
          } catch {
            return "";
          }
        })(),
        categories: source.categories,
        categoryLabels: source.categories,
        verified: true,
        is_breaking: false,
        trending_score: 0,
      } as NewsItem;
    }).filter((item) => item.title);
  } catch {
    return [];
  }
}

/* --------------------------- persistent news cache ------------------------ */
const DB_URL = Deno.env.get("SUPABASE_URL");
const DB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const NEWS_TTL_MS = 12 * 60_000;

async function readDbNews(): Promise<{ items: NewsItem[]; updatedAt: number } | null> {
  if (!DB_URL || !DB_KEY) return null;
  try {
    const res = await fetch(`${DB_URL}/rest/v1/news_cache?key=eq.all&select=payload,updated_at`, {
      headers: { apikey: DB_KEY, Authorization: `Bearer ${DB_KEY}` },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = rows?.[0];
    if (!row?.payload?.items) return null;
    return { items: row.payload.items as NewsItem[], updatedAt: new Date(row.updated_at).getTime() };
  } catch {
    return null;
  }
}

async function writeDbNews(items: NewsItem[]) {
  if (!DB_URL || !DB_KEY) return;
  try {
    await fetch(`${DB_URL}/rest/v1/news_cache?on_conflict=key`, {
      method: "POST",
      headers: {
        apikey: DB_KEY,
        Authorization: `Bearer ${DB_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([{ key: "all", payload: { items }, updated_at: new Date().toISOString() }]),
    });
  } catch (error) {
    console.error("news cache write failed", error);
  }
}

async function buildNews(): Promise<NewsItem[]> {
  const lists = await Promise.all(NEWS_SOURCES.map(fetchFeed));
  const items = lists.flat().sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
  await enrichImages(items);
  items.forEach((item, index) => {
    item.trending_score = Math.max(1, 100 - index);
    item.is_featured = index < 8;
    item.is_breaking = index < 3;
  });
  return items;
}

async function loadNews(force = false): Promise<NewsItem[]> {
  const cached = getCache<NewsItem[]>("news:all", force ? 0 : NEWS_TTL_MS);
  if (cached) return cached;

  if (!force) {
    const db = await readDbNews();
    if (db && Date.now() - db.updatedAt < NEWS_TTL_MS) {
      setCache("news:all", db.items);
      return db.items;
    }
    if (db?.items?.length) {
      // Serve slightly stale content immediately, refresh in the background.
      setCache("news:all", db.items);
      (async () => {
        const fresh = await buildNews();
        setCache("news:all", fresh);
        await writeDbNews(fresh);
      })().catch((error) => console.error("news background refresh failed", error));
      return db.items;
    }
  }

  const items = await buildNews();
  setCache("news:all", items);
  await writeDbNews(items);
  return items;
}

function sourcesPayload(items: NewsItem[]) {
  return NEWS_SOURCES.map((source) => {
    const count = items.filter((item) => item.source_id === source.id).length;
    return {
      id: source.id,
      name: source.name,
      source_group: source.group,
      categories: source.categories,
      priority: 1,
      status: count ? "ok" : "empty",
      last_success_at: new Date().toISOString(),
      last_count: count,
      last_error: count ? null : "no-items",
      site_url: source.site || source.url,
      language: source.language,
      region: source.language === "fr" ? "FR" : "INT",
    };
  });
}

async function handleNewsHome() {
  const items = await loadNews();
  const byCategory = (cat: string) => items.filter((item) => (item.categories || []).includes(cat)).slice(0, 14);
  return json({
    hero: items.slice(0, 5),
    featured: items.slice(0, 10),
    latest: items.slice(0, 24),
    rails: {
      anime: byCategory("anime"),
      manga: byCategory("manga"),
      gaming: byCategory("gaming"),
      "pop-culture": byCategory("pop-culture"),
    },
    trending: [...items].sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0)).slice(0, 12),
    calendar: items.slice(0, 12),
    sources: sourcesPayload(items),
    updated_at: new Date().toISOString(),
  });
}

async function handleNewsList(url: URL) {
  const items = await loadNews();
  const limit = Math.min(60, Number(url.searchParams.get("limit") || 24));
  const offset = Number(url.searchParams.get("offset") || 0);
  const category = url.searchParams.get("category");
  const source = url.searchParams.get("source");
  const sort = url.searchParams.get("sort") || "recent";
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();

  let filtered = items;
  if (category && category !== "all") filtered = filtered.filter((item) => (item.categories || []).includes(category));
  if (source && source !== "all") filtered = filtered.filter((item) => item.source_id === source);
  if (q) filtered = filtered.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(q));
  if (sort === "trending") filtered = [...filtered].sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));

  return json({
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    offset,
    limit,
    source: source || "all",
    categories: [
      { id: "anime", label: "Anime" },
      { id: "manga", label: "Manga" },
      { id: "gaming", label: "Gaming" },
      { id: "streaming", label: "Streaming" },
      { id: "pop-culture", label: "Culture pop japonaise" },
    ],
  });
}

async function handleNewsDetail(slug: string) {
  const items = await loadNews();
  const item = items.find((entry) => entry.slug === slug);
  if (!item) return json({ error: "not-found" }, 404);
  const related = items
    .filter((entry) => entry.slug !== slug && (entry.categories || []).some((cat: string) => (item.categories || []).includes(cat)))
    .slice(0, 8);
  return json({ item, related, source: item.source_id });
}

async function handleImageProxy(url: URL) {
  const target = url.searchParams.get("url");
  if (!target) return json({ error: "missing-url" }, 400);

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return json({ error: "bad-url" }, 400);
  }

  if (parsed.username || parsed.password) return json({ error: "bad-url" }, 400);
  if (!["http:", "https:"].includes(parsed.protocol)) return json({ error: "unsupported-scheme" }, 400);
  if (await isPrivateTarget(parsed.hostname)) return json({ error: "blocked-host" }, 403);

  const fallback = () => Response.redirect(target, 302);
  try {
    const res = await fetch(target, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Referer: `${parsed.origin}/`,
      },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
      const redirectUrl = res.headers.get("location") || "";
      try {
        const parsedRedirect = new URL(redirectUrl, target);
        if (await isPrivateTarget(parsedRedirect.hostname)) {
          return json({ error: "blocked-host" }, 403);
        }
      } catch {
        return fallback();
      }
      return Response.redirect(redirectUrl, res.status);
    }

    if (!res.ok) return fallback();

    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) return fallback();

    const body = await res.arrayBuffer();
    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return fallback();
  }
}

/* ---------------------------------- router -------------------------------- */
/* ------------------------------ prime catalog ----------------------------- */
const PRIME_PROVIDERS: Record<string, { name: string; logo: string; native?: boolean }> = {
  "amazon prime video": {
    name: "Amazon Prime Video",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg",
    native: true,
  },
  "prime video": {
    name: "Amazon Prime Video",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg",
    native: true,
  },
  amazon: {
    name: "Amazon Prime Video",
    logo: "https://upload.wikimedia.org/wikipedia/commons/1/11/Amazon_Prime_Video_logo.svg",
    native: true,
  },
  crunchyroll: { name: "Crunchyroll", logo: "https://static.crunchyroll.com/favicons/apple-touch-icon.png" },
  netflix: { name: "Netflix", logo: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" },
  youtube: { name: "YouTube", logo: "https://www.youtube.com/s/desktop/favicon.ico" },
  bilibili: { name: "Bilibili", logo: "https://www.bilibili.com/favicon.ico" },
  "bilibili tv": { name: "Bilibili", logo: "https://www.bilibili.com/favicon.ico" },
  hulu: { name: "Hulu", logo: "https://www.hulu.com/favicon.ico" },
  hidive: { name: "HIDIVE", logo: "https://www.hidive.com/favicon.ico" },
  "hbo max": { name: "HBO Max", logo: "https://www.max.com/favicon.ico" },
  max: { name: "HBO Max", logo: "https://www.max.com/favicon.ico" },
  "disney plus": { name: "Disney+", logo: "https://www.disneyplus.com/favicon.ico" },
  "disney+": { name: "Disney+", logo: "https://www.disneyplus.com/favicon.ico" },
  iqiyi: { name: "iQIYI", logo: "https://www.iq.com/favicon.ico" },
  "iq.com": { name: "iQIYI", logo: "https://www.iq.com/favicon.ico" },
};

const ANILIST_QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 50) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title { romaji english }
      coverImage { large color }
      bannerImage
      averageScore
      seasonYear
      format
      episodes
      genres
      description(asHtml: false)
      trailer { id site }
      externalLinks { site url type }
    }
  }
}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function anilistPage(page: number, attempt = 0): Promise<any[]> {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { page } }),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 4) return [];
      const retryAfter = Number(res.headers.get("retry-after") || 0);
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 1500 * (attempt + 1));
      return await anilistPage(page, attempt + 1);
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.Page?.media || [];
  } catch {
    if (attempt >= 3) return [];
    await sleep(1000 * (attempt + 1));
    return await anilistPage(page, attempt + 1);
  }
}

function mapPrimeMedia(media: any) {
  const links = Array.isArray(media?.externalLinks) ? media.externalLinks : [];
  const sources: any[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    if (link?.type && link.type !== "STREAMING") continue;
    const provider = PRIME_PROVIDERS[String(link?.site || "").toLowerCase().trim()];
    if (!provider || !link?.url) continue;
    if (seen.has(provider.name)) continue;
    seen.add(provider.name);
    sources.push({
      provider: provider.name,
      url: link.url,
      isNative: Boolean(provider.native),
      isPrimeBundle: true,
      logo: provider.logo,
    });
  }
  if (!sources.length) return null;
  const nativeSource = sources.find((source) => source.isNative);
  // Native Amazon entry should always sort last, like the reference layout.
  sources.sort((a, b) => Number(a.isNative) - Number(b.isNative));
  return {
    id: media.id,
    title: media?.title?.english || media?.title?.romaji || "",
    cover: media?.coverImage?.large || "",
    banner: media?.bannerImage || "",
    color: media?.coverImage?.color || "#1f6feb",
    score: media?.averageScore ?? null,
    year: media?.seasonYear ?? null,
    format: media?.format || "TV",
    episodes: media?.episodes ?? null,
    genres: media?.genres || [],
    description: String(media?.description || "").replace(/<[^>]+>/g, "").trim(),
    primeUrl: nativeSource?.url || null,
    isOnPrime: Boolean(nativeSource),
    sources,
    trailerId: media?.trailer?.site === "youtube" ? media?.trailer?.id || null : null,
  };
}

const PRIME_CACHE_KEY = "prime_catalog";
const PRIME_TTL_MS = 12 * 60 * 60_000;

async function buildPrimeCatalog() {
  const pages = Array.from({ length: 56 }, (_, index) => index + 1);
  const items: any[] = [];
  const chunkSize = 3;
  for (let index = 0; index < pages.length; index += chunkSize) {
    const batch = await Promise.all(pages.slice(index, index + chunkSize).map((page) => anilistPage(page)));
    for (const media of batch.flat()) {
      const mapped = mapPrimeMedia(media);
      if (mapped?.title) items.push(mapped);
    }
    await sleep(700);
  }
  return items;
}

async function loadPrimeCatalog(force = false) {
  const memory = getCache<any[]>(PRIME_CACHE_KEY, force ? 0 : PRIME_TTL_MS);
  if (memory) return memory;
  if (!force) {
    const db = await readDbCache<any[]>(PRIME_CACHE_KEY);
    if (db?.value?.length) {
      setCache(PRIME_CACHE_KEY, db.value);
      if (Date.now() - db.updatedAt >= PRIME_TTL_MS) {
        buildPrimeCatalog()
          .then(async (fresh) => {
            if (fresh.length) {
              setCache(PRIME_CACHE_KEY, fresh);
              await writeDbCache(PRIME_CACHE_KEY, fresh);
            }
          })
          .catch((error) => console.error("prime refresh failed", error));
      }
      return db.value;
    }
  }
  const items = await buildPrimeCatalog();
  const existing = getCache<any[]>(PRIME_CACHE_KEY, Number.MAX_SAFE_INTEGER) || [];
  if (items.length && items.length >= existing.length * 0.8) {
    setCache(PRIME_CACHE_KEY, items);
    await writeDbCache(PRIME_CACHE_KEY, items);
    return items;
  }
  return existing.length ? existing : items;
}

async function handlePrimeCatalog(url: URL) {
  const force = url.searchParams.get("refresh") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") || 4000) || 4000, 4000);
  const items = await loadPrimeCatalog(force);
  const sliced = items.slice(0, limit);
  return json({ items: sliced, count: sliced.length });
}

const PREWARM_TITLES = [
  "One Piece", "Jujutsu Kaisen", "Demon Slayer", "Chainsaw Man",
  "Solo Leveling", "Attack on Titan", "My Hero Academia", "Spy x Family",
];

async function handleRefresh(req: Request, url: URL) {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const scope = String(body?.scope || url.searchParams.get("scope") || "all").toLowerCase();
  const report: Record<string, unknown> = { scope };

  if (scope === "all" || scope === "translations") {
    let cleared = 0;
    for (const key of [...cache.keys()]) if (key.startsWith("tr:")) { cache.delete(key); cleared += 1; }
    report.translations_cleared = cleared;
  }
  if (scope === "all" || scope === "trailers") {
    for (const key of [...cache.keys()]) if (key.startsWith("mt:")) cache.delete(key);
    const key = Deno.env.get("YOUTUBE_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || undefined;
    const warmed = await Promise.all(
      PREWARM_TITLES.map(async (title) => {
        const target = new URL(url.toString());
        target.searchParams.set("q", title);
        try { await handleMultilingualTrailers(target); return title; } catch { return null; }
      }),
    );
    report.trailers_prewarmed = warmed.filter(Boolean).length;
    report.youtube_api = Boolean(key);
  }
  if (scope === "all" || scope === "news") {
    const items = await loadNews(true);
    report.news_items = items.length;
  }

  return json({ ok: true, ...report, updated_at: new Date().toISOString() });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1/, "").replace(/^\/api/, "").replace(/^\/?api/, "");
  const route = path.replace(/^\/?api\b/, "").replace(/^\//, "").replace(/^api\//, "");

  try {
    if (route === "translate" && req.method === "POST") return await handleTranslate(req);
    if (route === "prime/multilingual-trailers") return await handleMultilingualTrailers(url);
    if (route === "prime/catalog") return await handlePrimeCatalog(url);
    if (route === "news/home") return await handleNewsHome();
    if (route === "news/image-proxy") return await handleImageProxy(url);
    if (route === "image-proxy") return await handleImageProxy(url);
    if (route === "sync/news" && req.method === "POST") {
      if (!(await requireSyncSecret(req))) return json({ error: "unauthorized" }, 401);
      const items = await loadNews(true);
      return json({ ok: true, count: items.length, updated_at: new Date().toISOString() });
    }
    if (route === "sync/refresh" || route === "refresh") {
      if (!(await requireSyncSecret(req))) return json({ error: "unauthorized" }, 401);
      return await handleRefresh(req, url);
    }
    if (route === "news") return await handleNewsList(url);
    if (route.startsWith("news/")) return await handleNewsDetail(route.slice("news/".length));
    return json({ error: "not-found", route }, 404);
  } catch (error) {
    console.error("api error", route, error);
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});