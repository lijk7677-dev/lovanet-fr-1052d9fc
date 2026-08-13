import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_UNTIL_KEY = "lovanet.install.dismissedUntil.v2";
const DISMISS_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const AUTO_OPEN_DELAY_MS = 2400;

type DeviceClass = "ios" | "tablet" | "desktop" | "mobile";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const canShowPrompt = () => {
  try {
    const raw = localStorage.getItem(DISMISS_UNTIL_KEY);
    if (!raw) return true;
    const until = Number(raw);
    if (!Number.isFinite(until)) return true;
    return Date.now() >= until;
  } catch {
    return true;
  }
};

const detectDeviceClass = (): DeviceClass => {
  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const isIos = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
  if (isIos) return "ios";

  const isTabletUA = /iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 9|SM-T|Tab/i.test(ua);
  const isTabletByWidth = width >= 768 && width <= 1180 && /Android|Macintosh|Windows/i.test(ua);
  if (isTabletUA || isTabletByWidth) return "tablet";

  if (width >= 1024) return "desktop";
  return "mobile";
};

export const InstallAppPrompt = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("mobile");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.self !== window.top) return; // never inside preview iframe
    if (isStandalone()) return;
    if (!canShowPrompt()) return;

    setDeviceClass(detectDeviceClass());

    // Auto open for non-installed visitors on every platform.
    const autoTimer = window.setTimeout(() => {
      setOpen(true);
    }, AUTO_OPEN_DELAY_MS);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setIosHint(false);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    let timer: number | undefined;
    if (isIos) {
      timer = window.setTimeout(() => {
        setIosHint(true);
        setOpen(true);
      }, 2500);
    }

    const onInstalled = () => {
      setOpen(false);
      localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + 90 * 24 * 60 * 60 * 1000));
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) window.clearTimeout(timer);
      window.clearTimeout(autoTimer);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_UNTIL_KEY, String(Date.now() + DISMISS_COOLDOWN_MS));
  };

  const install = async () => {
    if (!deferred) {
      dismiss();
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
  };

  if (!open) return null;

  const instructionText =
    deviceClass === "ios"
      ? "Appuyez sur Partager, puis « Sur l'ecran d'accueil »"
      : deviceClass === "tablet"
        ? "Sur tablette, utilisez l'option « Installer l'application » dans le menu du navigateur si le bouton direct n'apparaît pas."
        : deviceClass === "desktop"
          ? "Sur PC, utilisez l'icône d'installation dans la barre d'adresse ou le menu du navigateur."
          : "Sur mobile Android, utilisez le menu du navigateur et choisissez « Installer l'application » si le bouton direct n'apparaît pas.";

  const audienceLabel =
    deviceClass === "ios"
      ? "Version iOS"
      : deviceClass === "tablet"
        ? "Version Tablette"
        : deviceClass === "desktop"
          ? "Version PC"
          : "Version Mobile";

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm rounded-[1.75rem] bg-white text-slate-900 shadow-2xl px-5 pb-6 pt-6 text-center animate-in fade-in zoom-in-95 duration-300 sm:rounded-3xl sm:p-7"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <img
          src="/lovanet-icon-512.png?v=5"
          alt="Logo Lovanet"
          width={160}
          height={160}
          className="mx-auto h-28 w-28 rounded-[1.5rem] object-contain shadow-xl sm:h-40 sm:w-40"
        />

        <h2 className="mt-4 text-xl font-bold tracking-tight sm:mt-5 sm:text-2xl">Installer Lovanet</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
          Lovanet Portail anime, manga, gaming, pop culture japonaise
        </p>
        <p className="mt-1 text-[12px] text-slate-500 sm:text-xs">
          Version installable optimisee pour une navigation mobile plus fluide.
        </p>
        <p className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-600">
          {audienceLabel}
        </p>

        {iosHint && !deferred ? (
          <p className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            <Share className="h-4 w-4 shrink-0" />
            Appuyez sur Partager, puis « Sur l'écran d'accueil »
          </p>
        ) : deferred ? (
          <button
            onClick={install}
            className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Installer l'application
          </button>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {instructionText}
          </p>
        )}

        <button onClick={dismiss} className="mt-3 w-full text-xs font-medium text-slate-400 hover:text-slate-600">
          Plus tard
        </button>
      </div>
    </div>
  );
};

export default InstallAppPrompt;