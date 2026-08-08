const BLOCKED_VIDEO_TITLE_SNIPPETS = [
  "so it's something else",
  "you did a good job",
  "i was working so much harder",
  "i'm just so impressed with your determination",
  "you haven't forgotten about the task at hand",
  "what do you want the most ? gold",
  "what do you want the most? gold",
];

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{10,15}$/;

function normalizeTitle(value: string | null | undefined): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBlockedVideoTitle(title: string | null | undefined): boolean {
  const normalized = normalizeTitle(title);
  if (!normalized) return true;
  return BLOCKED_VIDEO_TITLE_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

export function isLikelyYouTubeId(value: string | null | undefined): boolean {
  const id = String(value || "").trim();
  return YOUTUBE_ID_RE.test(id);
}

export function isAllowedYouTubeVideo(externalId: string | null | undefined, title: string | null | undefined): boolean {
  return isLikelyYouTubeId(externalId) && !isBlockedVideoTitle(title);
}
