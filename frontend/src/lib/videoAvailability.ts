// Persistent availability cache for anime trailers keyed by anime id.
// Prevents retrying YouTube videos we already know are broken (region-locked,
// removed, embed-disabled) so the catalog opens instantly on repeat visits.
import { idbGet, idbSet } from "./animeCache";

export type VideoAvailability = "ok" | "unavailable" | "hidden";
// - ok:          primary videoId played fine at least once
// - unavailable: primary videoId is broken → skip it and go straight to search
// - hidden:      even the search fallback failed → don't render a player at all

type Entry = { status: VideoAvailability; ts: number };
type Cache = Record<string, Entry>;

const KEY = "video-availability:v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
let mem: Cache | null = null;
let loading: Promise<Cache> | null = null;

async function load(): Promise<Cache> {
  if (mem) return mem;
  if (loading) return loading;
  loading = (async () => {
    const raw = (await idbGet<Cache>(KEY)) || {};
    const now = Date.now();
    const fresh: Cache = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && now - v.ts < TTL_MS) fresh[k] = v;
    }
    mem = fresh;
    return fresh;
  })();
  return loading;
}

function persist() {
  if (mem) idbSet(KEY, mem);
}

/** Synchronous read — call `warmVideoAvailability()` once at mount to hydrate. */
export function getVideoStatusSync(animeId: number | string): VideoAvailability | undefined {
  if (!mem) return undefined;
  return mem[String(animeId)]?.status;
}

export async function warmVideoAvailability(): Promise<void> {
  await load();
}

export function setVideoStatus(animeId: number | string, status: VideoAvailability): void {
  if (!mem) mem = {};
  const key = String(animeId);
  // Never downgrade "hidden" back to "unavailable" within the same session.
  const prev = mem[key]?.status;
  if (prev === "hidden" && status !== "ok") return;
  mem[key] = { status, ts: Date.now() };
  persist();
}
