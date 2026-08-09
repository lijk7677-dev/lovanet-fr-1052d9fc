import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Platform = "youtube" | "tiktok" | "prime" | "news" | "all";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

type Props = {
  /** Which sync edge functions to trigger. */
  platform?: Platform;
  /** Optional label override. */
  label?: string;
  /** Called after the sync attempt completes (success or error) so the page can refresh. */
  onDone?: () => void;
  /** Fixed floating position (default) or inline. */
  variant?: "floating" | "inline";
  className?: string;
};

const CACHE_MAP: Record<Platform, readonly string[]> = {
  youtube: [
    "lovanet.cache.yt.",
    "lovanet.cache.ytIds",
  ],
  tiktok: [
    "lovanet.cache.tiktok.",
  ],
  prime: [
    "lovanet.cache.prime.",
  ],
  news: [
    "lovanet.cache.news.",
  ],
  all: [
    "lovanet.cache.",
  ],
};

function matchesAny(key: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => (p.endsWith(".") ? key.startsWith(p) : key === p));
}

export function clearClientCaches(platform: Platform = "all") {
  const patterns = CACHE_MAP[platform] ?? CACHE_MAP.all;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && matchesAny(key, patterns)) localStorage.removeItem(key);
    }
  } catch (error) {
    console.debug("clearClientCaches ignored", error);
  }
}

export const ManualSyncButton = ({
  platform = "all",
  label = "Sync manuel",
  onDone,
  variant = "inline",
  className,
}: Props) => {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");
  const [mode, setMode] = useState<"incremental" | "full">("incremental");

  const run = async (full = false) => {
    if (state === "loading") return;
    setState("loading");
    setMode(full ? "full" : "incremental");
    setMsg("");
    try {
      const target = platform === "all" ? "all" : platform;
      const response = await fetch(`${API}/admin/sync/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (!response.ok) throw new Error(`Sync backend ${response.status}`);
      const result = await response.json();
      const degraded = result.status === "degraded" || result.status === "partial" || Object.values(result.results ?? {}).some((value: any) => value?.status === "degraded");
      setState(degraded ? "error" : "done");
      setMsg(degraded ? "Sync partielle" : full ? "Full sync OK" : "Sync OK");
      if (full) {
        clearClientCaches(platform);
      }
      onDone?.();
    } catch (e) {
      console.error("ManualSyncButton failed", e);
      setState("error");
      setMsg("Erreur réseau");
    } finally {
      setTimeout(() => setState((s) => (s === "loading" ? s : "idle")), 3200);
    }
  };

  const Icon =
    state === "done" ? CheckCircle2 : state === "error" ? AlertTriangle : RefreshCw;
  const tone =
    state === "done"
      ? "bg-emerald-500/90 hover:bg-emerald-500 text-white"
      : state === "error"
      ? "bg-red-500/90 hover:bg-red-500 text-white"
      : "bg-black/80 hover:bg-black text-white dark:bg-white/10 dark:hover:bg-white/20 backdrop-blur-md border border-white/15";

  return (
    <div
      className={cn(
        "inline-flex items-stretch gap-1 rounded-full shadow-lg",
        variant === "floating" && "fixed bottom-5 right-5 z-[70]",
        className,
      )}
    >
      <button
        data-testid={`manual-sync-${platform}-button`}
        type="button"
        onClick={() => run(false)}
        disabled={state === "loading"}
        aria-label="Lancer une synchronisation incrémentale"
        title="Rafraîchit les derniers contenus publiés"
        className={cn(
          "inline-flex items-center gap-2 rounded-l-full px-4 py-2 text-sm font-medium transition-all",
          tone,
          state === "loading" && "opacity-90",
        )}
      >
        <Icon className={cn("w-4 h-4", state === "loading" && mode === "incremental" && "animate-spin")} />
        <span>
          {state === "loading" && mode === "incremental"
            ? "Sync en cours…"
            : msg && mode === "incremental"
            ? msg
            : label}
        </span>
      </button>
      <button
        data-testid={`manual-full-sync-${platform}-button`}
        type="button"
        onClick={() => run(true)}
        disabled={state === "loading"}
        aria-label="Lancer un full sync : purge le cache et régénère le flux"
        title="Full sync : purge le cache local et relance un refresh complet"
        className={cn(
          "inline-flex items-center gap-1 rounded-r-full px-3 py-2 text-sm font-semibold transition-all border-l border-white/20",
          state === "loading" && mode === "full"
            ? "bg-amber-500 text-white"
            : "bg-amber-500/90 hover:bg-amber-500 text-white",
          state === "loading" && "opacity-90",
        )}
      >
        <Zap className={cn("w-4 h-4", state === "loading" && mode === "full" && "animate-pulse")} />
        <span className="hidden sm:inline">Full</span>
      </button>
    </div>
  );
};

export default ManualSyncButton;
