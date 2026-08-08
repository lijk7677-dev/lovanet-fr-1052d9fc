import { getVideoStatusSync, setVideoStatus, warmVideoAvailability } from "@/lib/videoAvailability";

export type YouTubeAvailabilityApiItem = {
  video_id: string;
  available: boolean;
  status: string;
  thumbnail?: string;
};

export async function hydrateYouTubeAvailability(videoIds: Array<string | null | undefined>) {
  await warmVideoAvailability();
  const unique = Array.from(new Set(videoIds.map((value) => String(value || "").trim()).filter(Boolean)));
  const missing = unique.filter((videoId) => !getVideoStatusSync(videoId));
  if (!missing.length) return [] as YouTubeAvailabilityApiItem[];

  const endpoint = `${process.env.REACT_APP_BACKEND_URL}/api/youtube/availability`;
  const items: YouTubeAvailabilityApiItem[] = [];
  const chunkSize = 40;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_ids: chunk }),
    });

    if (!response.ok) {
      throw new Error(`youtube-availability-http-${response.status}`);
    }

    const json = await response.json();
    const chunkItems = Array.isArray(json?.items) ? (json.items as YouTubeAvailabilityApiItem[]) : [];
    for (const item of chunkItems) {
      setVideoStatus(item.video_id, item.available ? "ok" : "unavailable");
    }
    items.push(...chunkItems);
  }
  return items;
}
