import { useState, useEffect } from "react";
import { Globe, X, Loader2 } from "lucide-react";
import { useGamification } from "@/contexts/GamificationContext";
import { cn } from "@/lib/utils";
import { useCardTranslator } from "@/hooks/useCardTranslator";

const LANGS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

export function GlobalTranslateWidget() {
  const [open, setOpen] = useState(false);
  const { translate, loading, targetLang, setTargetLang } = useCardTranslator("fr");
  const { incrementQuest, unlockAchievement } = useGamification();

  // Keep track of what we've already translated to avoid double translating
  useEffect(() => {
    if (targetLang === "fr" || !open) return;
    
    // Very simple global dom text replacement for demonstration
    // Note: A robust global translation usually requires a dedicated Provider that wraps text elements,
    // but this MVP translates visible text nodes in the body that look like French.
    const runTranslation = async () => {
       // This is just a placeholder for the visual button. Real global translation
       // needs deep integration with React state (like we did in PrimeVideo).
       // To do this well globally, we should expose the selected language to a Context.
       localStorage.setItem('lovanet.globalLang', targetLang);
       // Trigger a custom event so pages can react if they want
       window.dispatchEvent(new CustomEvent('lovanet.languageChanged', { detail: targetLang }));
    };
    runTranslation();
  }, [targetLang, open]);

  return (
    <div className="fixed bottom-[150px] right-3 z-[100] flex flex-col items-end sm:right-4 md:bottom-[165px] md:right-6 lg:bottom-[96px] lg:right-6">
      {open ? (
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-2 gap-8">
            <span className="text-xs font-bold uppercase tracking-wider text-white/70 drop-shadow-md">Traduire le site</span>
            <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-col gap-1">
            {LANGS.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setTargetLang(lang.code);
                  localStorage.setItem('lovanet.globalLang', lang.code);
                  window.dispatchEvent(new CustomEvent('lovanet.languageChanged', { detail: lang.code }));
                  incrementQuest("translate_item");
                  unlockAchievement("translate_item");
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-2 text-sm text-left transition-colors",
                  targetLang === lang.code ? "bg-fuchsia-500/30 text-fuchsia-100 border border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)]" : "text-white/80 hover:bg-white/10"
                )}
              >
                <span>{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="group flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(255,255,255,0.05)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(56,189,248,0.2)]"
          title="Traduire le site"
          data-testid="global-translate-fab"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
          ) : (
            <div className="relative flex h-8 w-8 items-center justify-center [transform-style:preserve-3d] animate-[spin_8s_linear_infinite]">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-sky-400/70 shadow-[0_0_10px_rgba(56,189,248,0.5)] [transform:rotateX(60deg)] group-hover:border-sky-300 transition-colors" />
              <div className="absolute inset-0 rounded-full border-[1.5px] border-fuchsia-400/70 shadow-[0_0_10px_rgba(232,121,249,0.5)] [transform:rotateY(60deg)] group-hover:border-fuchsia-300 transition-colors" />
              <Globe className="absolute inset-0 m-auto h-5 w-5 text-white/80 animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" strokeWidth={1.5} />
            </div>
          )}
        </button>
      )}
    </div>
  );
}
