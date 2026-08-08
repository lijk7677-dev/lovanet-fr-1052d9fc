import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Gem,
  Palette,
  RefreshCcw,
  Search,
  Shuffle,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ThemeMood = "all" | "neon" | "glass" | "cyber" | "glacier" | "pearl" | "prism" | "mono";

type ThemeOption = {
  id: string;
  label: string;
  family: string;
  finish: string;
  variant: string;
  mood: Exclude<ThemeMood, "all">;
  tags: string[];
  swatch: string;
  backgroundHex: string;
  backgroundHsl: string;
  cardHex: string;
  cardHsl: string;
  card2Hex: string;
  card2Hsl: string;
  borderHex: string;
  borderHsl: string;
  primaryHex: string;
  primaryHsl: string;
  accentHex: string;
  accentHsl: string;
  tertiaryHex: string;
  tertiaryHsl: string;
  foregroundHex: string;
  foregroundHsl: string;
  cardForegroundHex: string;
  cardForegroundHsl: string;
  overlayForegroundHex: string;
  overlayForegroundHsl: string;
  mutedHex: string;
  mutedHsl: string;
  primaryForegroundHex: string;
  primaryForegroundHsl: string;
  pageTint: string;
  heroGradient: string;
  overlay: string;
  overlayStrong: string;
  glow: string;
  glowSoft: string;
  borderSoft: string;
  borderStrong: string;
  noiseOpacity: string;
  ringHex: string;
  ringHsl: string;
  pillHsl: string;
};

type FamilyDef = {
  key: string;
  label: string;
  hue: number;
  tags: string[];
};

type VariantDef = {
  key: string;
  label: string;
  saturationShift: number;
  lightnessShift: number;
  neonShift: number;
  backgroundLift: number;
  tags: string[];
};

type FinishDef = {
  key: string;
  label: string;
  mood: Exclude<ThemeMood, "all">;
  hueShift: number;
  saturationBoost: number;
  backgroundOffset: number;
  cardLift: number;
  brightness: number;
  tags: string[];
};

const STORAGE_KEY = "lovanet:theme-v2";
const FAVORITES_KEY = "lovanet:theme-favorites";
const RECENTS_KEY = "lovanet:theme-recents";
const NAV_MODE_KEY = "lovanet:nav-theme-mode";
const DEFAULT_THEME_ID = "cobalt-deep-velvet";
const RECENT_LIMIT = 18;
const BRIGHT_TEXT = "#f7faff";
const DARK_TEXT = "#0b1020";
const NAV_PREVIEW_MODES = [
  { id: "derived", label: "Synchronisé" },
  { id: "intense", label: "Accentué" },
  { id: "contrast", label: "Contraste" },
] as const;

type NavPreviewMode = (typeof NAV_PREVIEW_MODES)[number]["id"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toHslToken = (h: number, s: number, l: number) => `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

const hslToRgb = (h: number, s: number, l: number) => {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((channel) => clamp(channel, 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;

const hslToHex = (h: number, s: number, l: number) => {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

const rgbToHslToken = (r: number, g: number, b: number) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case red:
        h = 60 * (((green - blue) / delta) % 6);
        break;
      case green:
        h = 60 * ((blue - red) / delta + 2);
        break;
      default:
        h = 60 * ((red - green) / delta + 4);
        break;
    }
  }

  return toHslToken((h + 360) % 360, s * 100, l * 100);
};

const hexToHslToken = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHslToken(r, g, b);
};

const srgbToLinear = (value: number) => {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

const contrastRatio = (first: string, second: string) => {
  const luminanceA = relativeLuminance(first);
  const luminanceB = relativeLuminance(second);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
};

const mixHex = (first: string, second: string, amount: number) => {
  const ratio = clamp(amount, 0, 1);
  const left = hexToRgb(first);
  const right = hexToRgb(second);
  return rgbToHex(
    Math.round(left.r + (right.r - left.r) * ratio),
    Math.round(left.g + (right.g - left.g) * ratio),
    Math.round(left.b + (right.b - left.b) * ratio),
  );
};

const alphaHex = (hex: string, opacity: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacity, 0, 1).toFixed(3)})`;
};

const pickReadableTextColor = (background: string, minimum = 4.5) => {
  const candidates = [BRIGHT_TEXT, "#edf4ff", "#dbeafe", DARK_TEXT, "#111827"];
  const match = candidates.find((candidate) => contrastRatio(background, candidate) >= minimum);
  return match ?? (relativeLuminance(background) > 0.22 ? DARK_TEXT : BRIGHT_TEXT);
};

const readStoredArray = (key: string) => {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const FAMILY_DEFS: FamilyDef[] = [
  { key: "azure", label: "Azur", hue: 205, tags: ["bleu", "ocean", "electrique"] },
  { key: "sakura", label: "Sakura", hue: 334, tags: ["rose", "anime", "dream"] },
  { key: "emerald", label: "Émeraude", hue: 152, tags: ["vert", "nature", "luxe"] },
  { key: "violet", label: "Violet", hue: 272, tags: ["mystique", "electro", "nuit"] },
  { key: "ember", label: "Ember", hue: 16, tags: ["magma", "feu", "sunset"] },
  { key: "glacier", label: "Glacier", hue: 190, tags: ["ice", "froid", "cristal"] },
  { key: "gold", label: "Or", hue: 46, tags: ["gold", "royal", "collector"] },
  { key: "ruby", label: "Ruby", hue: 352, tags: ["ruby", "intense", "brillant"] },
  { key: "mint", label: "Menthe", hue: 168, tags: ["mint", "fresh", "clean"] },
  { key: "cobalt", label: "Cobalt", hue: 224, tags: ["cobalt", "deep", "tech"] },
  { key: "amethyst", label: "Améthyste", hue: 286, tags: ["gemme", "neon", "crystal"] },
  { key: "teal", label: "Lagune", hue: 182, tags: ["lagoon", "cyan", "glass"] },
  { key: "sunrise", label: "Aube", hue: 28, tags: ["orange", "golden", "warm"] },
  { key: "pearl", label: "Perle", hue: 214, tags: ["pearl", "lunaire", "frost"] },
  { key: "obsidian", label: "Obsidienne", hue: 248, tags: ["mono", "shadow", "dark"] },
  { key: "lime", label: "Lime", hue: 104, tags: ["lime", "arcade", "cyber"] },
];

const VARIANT_DEFS: VariantDef[] = [
  { key: "default", label: "Standard", saturationShift: 0, lightnessShift: 0, neonShift: 0, backgroundLift: 0, tags: ["standard", "base"] },
  { key: "vibrant", label: "Vibrant", saturationShift: 25, lightnessShift: 5, neonShift: 30, backgroundLift: 15, tags: ["vibrant", "color", "pop"] },
  { key: "deep", label: "Profond", saturationShift: 15, lightnessShift: -10, neonShift: 5, backgroundLift: -5, tags: ["deep", "dark", "intense"] },
  { key: "soft", label: "Doux", saturationShift: -15, lightnessShift: 15, neonShift: -10, backgroundLift: 30, tags: ["soft", "light", "pastel"] },
];

const FINISH_DEFS: FinishDef[] = [
  { key: "glasswave", label: "Glasswave", mood: "glass", hueShift: 0, saturationBoost: 6, backgroundOffset: 1, cardLift: 13, brightness: 5, tags: ["glass", "wave", "liquid"] },
  { key: "cyber", label: "Cyber", mood: "cyber", hueShift: 20, saturationBoost: 16, backgroundOffset: -3, cardLift: 7, brightness: 8, tags: ["cyber", "tech", "future"] },
  { key: "velvet", label: "Velvet", mood: "mono", hueShift: 0, saturationBoost: -18, backgroundOffset: -2, cardLift: 6, brightness: -1, tags: ["velvet", "mono", "shadow"] },
  { key: "holo", label: "Holo", mood: "neon", hueShift: 40, saturationBoost: 12, backgroundOffset: 0, cardLift: 10, brightness: 9, tags: ["holo", "hologram", "color-shift"] },
];

const buildThemeCatalog = () => {
  const themes: ThemeOption[] = [];

  FAMILY_DEFS.forEach((family) => {
    VARIANT_DEFS.forEach((variant) => {
      FINISH_DEFS.forEach((finish) => {
        const baseHue = (family.hue + finish.hueShift + 360) % 360;
        const saturation = clamp(72 + variant.saturationShift + finish.saturationBoost, 10, 100);
        
        // Ensure some backgrounds are truly vibrant or light when the variant calls for it
        let bgLiftBase = 10 + variant.backgroundLift + finish.backgroundOffset;
        if (variant.key === "soft") bgLiftBase = 60; // Light theme background
        if (variant.key === "vibrant") bgLiftBase = 35; // Colorful background
        if (variant.key === "deep") bgLiftBase = 4; // Very dark background

        const backgroundLightness = clamp(bgLiftBase, 2, 90);
        const cardLightness = clamp(backgroundLightness + finish.cardLift + (variant.key === "soft" ? 10 : 0), 10, 95);
        const card2Lightness = clamp(cardLightness + 3, 12, 98);
        const primaryLightness = clamp(58 + variant.lightnessShift + finish.brightness, 20, 85);
        const accentHue = (baseHue + 38) % 360;
        const tertiaryHue = (baseHue + 124) % 360;

        // Use more of the hue in the background for vibrant/soft variants
        const bgSaturation = variant.key === "vibrant" || variant.key === "soft" ? clamp(saturation - 10, 20, 80) : clamp(saturation - 32, 5, 40);
        
        const backgroundHex = hslToHex(baseHue, bgSaturation, backgroundLightness);
        const cardHex = hslToHex(baseHue, bgSaturation + 5, cardLightness);
        const card2Hex = hslToHex(accentHue, bgSaturation + 10, card2Lightness);
        const borderHex = mixHex(card2Hex, BRIGHT_TEXT, finish.mood === "glass" || finish.mood === "pearl" ? 0.24 : 0.12);
        const primaryHex = hslToHex(baseHue, clamp(saturation + 6, 36, 100), primaryLightness);
        const accentHex = hslToHex(accentHue, clamp(saturation + 2, 34, 100), clamp(primaryLightness + 2, 50, 78));
        const tertiaryHex = hslToHex(tertiaryHue, clamp(saturation + 4, 32, 100), clamp(primaryLightness + 1, 46, 80));

        const foregroundHex = pickReadableTextColor(backgroundHex);
        const cardForegroundHex = pickReadableTextColor(cardHex);
        const overlayForegroundHex = pickReadableTextColor(mixHex(backgroundHex, cardHex, 0.52));
        const primaryForegroundHex = pickReadableTextColor(primaryHex, 3.2);
        const mutedHex = mixHex(cardForegroundHex, cardHex, 0.42);
        const overlayAlpha = finish.mood === "glass" || finish.mood === "pearl" ? 0.76 : 0.82;
        const overlay = alphaHex(mixHex(backgroundHex, cardHex, 0.58), overlayAlpha);
        const overlayStrong = alphaHex(mixHex(backgroundHex, DARK_TEXT, 0.48), clamp(overlayAlpha + 0.09, 0.76, 0.92));
        const pageTint = `radial-gradient(circle at 14% 18%, ${alphaHex(primaryHex, 0.18)} 0%, transparent 26%), radial-gradient(circle at 84% 16%, ${alphaHex(accentHex, 0.16)} 0%, transparent 22%), radial-gradient(circle at 50% 100%, ${alphaHex(tertiaryHex, 0.14)} 0%, transparent 30%), linear-gradient(160deg, ${backgroundHex} 0%, ${mixHex(backgroundHex, cardHex, 0.58)} 52%, ${mixHex(backgroundHex, DARK_TEXT, 0.3)} 100%)`;
        const heroGradient = `linear-gradient(135deg, ${alphaHex(mixHex(backgroundHex, DARK_TEXT, 0.22), 0.96)} 0%, ${alphaHex(cardHex, 0.96)} 52%, ${alphaHex(card2Hex, 0.94)} 100%)`;
        const swatch = `linear-gradient(135deg, ${backgroundHex} 0%, ${cardHex} 50%, ${primaryHex} 100%)`;

        themes.push({
          id: `${family.key}-${variant.key}-${finish.key}`,
          label: `${family.label} ${variant.label} ${finish.label}`,
          family: family.label,
          finish: finish.label,
          variant: variant.label,
          mood: finish.mood,
          tags: [family.label, variant.label, finish.label, ...family.tags, ...variant.tags, ...finish.tags],
          swatch,
          backgroundHex,
          backgroundHsl: hexToHslToken(backgroundHex),
          cardHex,
          cardHsl: hexToHslToken(cardHex),
          card2Hex,
          card2Hsl: hexToHslToken(card2Hex),
          borderHex,
          borderHsl: hexToHslToken(borderHex),
          primaryHex,
          primaryHsl: hexToHslToken(primaryHex),
          accentHex,
          accentHsl: hexToHslToken(accentHex),
          tertiaryHex,
          tertiaryHsl: hexToHslToken(tertiaryHex),
          foregroundHex,
          foregroundHsl: hexToHslToken(foregroundHex),
          cardForegroundHex,
          cardForegroundHsl: hexToHslToken(cardForegroundHex),
          overlayForegroundHex,
          overlayForegroundHsl: hexToHslToken(overlayForegroundHex),
          mutedHex,
          mutedHsl: hexToHslToken(mutedHex),
          primaryForegroundHex,
          primaryForegroundHsl: hexToHslToken(primaryForegroundHex),
          pageTint,
          heroGradient,
          overlay,
          overlayStrong,
          glow: `0 0 18px ${alphaHex(primaryHex, 0.3)}, 0 0 44px ${alphaHex(accentHex, 0.2)}`,
          glowSoft: `0 0 12px ${alphaHex(primaryHex, 0.18)}, 0 0 28px ${alphaHex(tertiaryHex, 0.12)}`,
          borderSoft: alphaHex(BRIGHT_TEXT, 0.14),
          borderStrong: alphaHex(BRIGHT_TEXT, 0.24),
          noiseOpacity: finish.mood === "glass" || finish.mood === "pearl" ? "0.036" : "0.028",
          ringHex: mixHex(primaryHex, BRIGHT_TEXT, 0.22),
          ringHsl: hexToHslToken(mixHex(primaryHex, BRIGHT_TEXT, 0.22)),
          pillHsl: toHslToken(baseHue, clamp(saturation - 12, 18, 88), clamp(cardLightness + 4, 20, 36)),
        });
      });
    });
  });


  // Filter out similar themes
  const uniqueThemes = [];
  const seenSignatures = new Set();
  
  for (const t of themes) {
    // Generate a signature for uniqueness based on background, card, and primary color
    // We quantize the hex to catch very similar colors (e.g., #112233 and #122334)
    const getSig = (hex) => {
      if (!hex) return '';
      // take the first digit of each RGB component to group similar colors
      const r = hex[1] || '0';
      const g = hex[3] || '0';
      const b = hex[5] || '0';
      return r + g + b;
    };
    
    const sig = getSig(t.backgroundHex) + '-' + getSig(t.primaryHex) + '-' + t.mood;
    
    // Also ensuring no exact duplicates of background+primary combos
    const exactSig = t.backgroundHex + '-' + t.primaryHex;
    
    if (!seenSignatures.has(sig) && !seenSignatures.has(exactSig)) {
      seenSignatures.add(sig);
      seenSignatures.add(exactSig);
      uniqueThemes.push(t);
    }
  }

  // Sort them so they look organized
  uniqueThemes.sort((a, b) => {
    if (a.family !== b.family) return a.family.localeCompare(b.family);
    return a.variant.localeCompare(b.variant);
  });

  return uniqueThemes;
};

const THEME_CATALOG = buildThemeCatalog();

const applyNavTheme = (theme: ThemeOption, mode: NavPreviewMode) => {
  const root = document.documentElement;
  const styles = root.style;

  const accent = mode === "contrast" ? mixHex(theme.primaryHex, BRIGHT_TEXT, 0.24) : theme.primaryHex;
  const accent2 = mode === "contrast" ? mixHex(theme.accentHex, BRIGHT_TEXT, 0.18) : mode === "intense" ? mixHex(theme.accentHex, BRIGHT_TEXT, 0.08) : theme.accentHex;
  const accent3 = mode === "contrast" ? mixHex(theme.tertiaryHex, BRIGHT_TEXT, 0.14) : mode === "intense" ? mixHex(theme.tertiaryHex, BRIGHT_TEXT, 0.08) : theme.tertiaryHex;
  const navBg = mode === "intense" ? alphaHex(mixHex(theme.backgroundHex, DARK_TEXT, 0.34), 0.74) : mode === "contrast" ? alphaHex(mixHex(theme.backgroundHex, DARK_TEXT, 0.52), 0.82) : alphaHex(mixHex(theme.backgroundHex, theme.cardHex, 0.46), 0.72);
  const navSurface = mode === "intense" ? alphaHex(mixHex(theme.cardHex, DARK_TEXT, 0.18), 0.9) : mode === "contrast" ? alphaHex(mixHex(theme.cardHex, DARK_TEXT, 0.32), 0.94) : alphaHex(mixHex(theme.cardHex, theme.card2Hex, 0.28), 0.86);
  const navText = pickReadableTextColor(mode === "contrast" ? mixHex(theme.cardHex, DARK_TEXT, 0.32) : theme.cardHex, 5);
  const navMuted = alphaHex(navText, navText === DARK_TEXT ? 0.66 : 0.74);
  const navBorder = mode === "contrast" ? alphaHex(accent, 0.28) : alphaHex(BRIGHT_TEXT, 0.18);

  styles.setProperty("--bubble-h", String(parseInt(theme.primaryHsl.split(" ")[0], 10) || 210));
  styles.setProperty("--bubble-s", `${parseInt(theme.primaryHsl.split(" ")[1], 10) || 92}%`);
  styles.setProperty("--bubble-l", `${parseInt(theme.primaryHsl.split(" ")[2], 10) || 58}%`);
  styles.setProperty("--bubble-a", accent);
  styles.setProperty("--bubble-b", accent2);
  styles.setProperty("--bubble-c", accent3);
  styles.setProperty("--nav-theme-bg", navBg);
  styles.setProperty("--nav-theme-surface", navSurface);
  styles.setProperty("--nav-theme-border", navBorder);
  styles.setProperty("--nav-theme-accent", accent);
  styles.setProperty("--nav-theme-accent-2", accent2);
  styles.setProperty("--nav-theme-accent-3", accent3);
  styles.setProperty("--nav-theme-text", navText);
  styles.setProperty("--nav-theme-muted", navMuted);
  styles.setProperty("--nav-theme-shadow", `0 18px 54px -28px ${alphaHex(DARK_TEXT, 0.58)}`);
  root.dataset.navThemeMode = mode;
};

const applyTheme = (theme: ThemeOption, navMode: NavPreviewMode = "derived") => {
  const root = document.documentElement;
  const styles = root.style;

  styles.setProperty("--background", theme.backgroundHsl);
  styles.setProperty("--foreground", theme.foregroundHsl);
  styles.setProperty("--card", theme.cardHsl);
  styles.setProperty("--card-foreground", theme.cardForegroundHsl);
  styles.setProperty("--popover", theme.card2Hsl);
  styles.setProperty("--popover-foreground", theme.overlayForegroundHsl);
  styles.setProperty("--secondary", theme.card2Hsl);
  styles.setProperty("--secondary-foreground", theme.cardForegroundHsl);
  styles.setProperty("--muted", theme.card2Hsl);
  styles.setProperty("--muted-foreground", theme.mutedHsl);
  styles.setProperty("--border", theme.borderHsl);
  styles.setProperty("--input", theme.borderHsl);
  styles.setProperty("--primary", theme.primaryHsl);
  styles.setProperty("--primary-foreground", theme.primaryForegroundHsl);
  styles.setProperty("--accent", theme.accentHsl);
  styles.setProperty("--accent-foreground", theme.primaryForegroundHsl);
  styles.setProperty("--ring", theme.ringHsl);
  styles.setProperty("--surface", theme.cardHsl);
  styles.setProperty("--surface-elevated", theme.card2Hsl);
  styles.setProperty("--pill", theme.pillHsl);
  styles.setProperty("--neon-cyan", theme.primaryHsl);
  styles.setProperty("--neon-magenta", theme.accentHsl);
  styles.setProperty("--neon-purple", theme.tertiaryHsl);
  styles.setProperty("--gradient-hero", theme.heroGradient);
  styles.setProperty("--gradient-neon", `linear-gradient(135deg, ${theme.primaryHex} 0%, ${theme.accentHex} 52%, ${theme.tertiaryHex} 100%)`);
  styles.setProperty("--glow-cyan", `0 8px 30px ${alphaHex(theme.primaryHex, 0.35)}`);
  styles.setProperty("--glow-magenta", `0 8px 30px ${alphaHex(theme.accentHex, 0.28)}`);
  styles.setProperty("--glow-subtle", `0 6px 22px ${alphaHex(DARK_TEXT, 0.42)}`);
  styles.setProperty("--site-tint", theme.pageTint);

  styles.setProperty("--theme-bg", theme.backgroundHex);
  styles.setProperty("--theme-card", theme.cardHex);
  styles.setProperty("--theme-card-2", theme.card2Hex);
  styles.setProperty("--theme-border", theme.borderHex);
  styles.setProperty("--theme-border-soft", theme.borderSoft);
  styles.setProperty("--theme-border-strong", theme.borderStrong);
  styles.setProperty("--theme-overlay", theme.overlay);
  styles.setProperty("--theme-overlay-strong", theme.overlayStrong);
  styles.setProperty("--theme-fg-on-bg", theme.foregroundHex);
  styles.setProperty("--theme-fg-on-card", theme.cardForegroundHex);
  styles.setProperty("--theme-fg-on-overlay", theme.overlayForegroundHex);
  styles.setProperty("--theme-muted", theme.mutedHex);
  styles.setProperty("--theme-link", theme.primaryHex);
  styles.setProperty("--theme-link-hover", theme.accentHex);
  styles.setProperty("--theme-glow", theme.glow);
  styles.setProperty("--theme-glow-2", theme.glowSoft);
  styles.setProperty("--theme-ring", theme.ringHex);
  styles.setProperty("--theme-neon-a", theme.primaryHex);
  styles.setProperty("--theme-neon-b", theme.accentHex);
  styles.setProperty("--theme-neon-c", theme.tertiaryHex);
  styles.setProperty("--theme-noise-opacity", theme.noiseOpacity);

  applyNavTheme(theme, navMode);

  root.dataset.themeId = theme.id;
  root.dataset.themeMood = theme.mood;
  root.style.colorScheme = "dark";
  document.body.style.background = theme.pageTint;
  document.body.style.backgroundAttachment = "fixed";
  document.body.style.color = theme.foregroundHex;
};

const SHAPES = [
  { key: "ring", viewBox: "0 0 64 64", element: <><circle cx="32" cy="32" r="18" /><circle cx="32" cy="32" r="9" /><path d="M32 6v8M32 50v8M6 32h8M50 32h8" /></> },
  { key: "crystal", viewBox: "0 0 64 64", element: <path d="M32 6 46 18 42 42 32 58 22 42 18 18Z" /> },
  { key: "diamond", viewBox: "0 0 64 64", element: <path d="M32 8 54 32 32 56 10 32Z" /> },
  { key: "target", viewBox: "0 0 64 64", element: <><circle cx="32" cy="32" r="21" /><circle cx="32" cy="32" r="13" /><circle cx="32" cy="32" r="4" /></> },
  { key: "hex-star", viewBox: "0 0 64 64", element: <path d="M32 7 41 19 56 22 46 33 48 48 32 41 16 48 18 33 8 22 23 19Z" /> },
  { key: "orbit", viewBox: "0 0 64 64", element: <><ellipse cx="32" cy="32" rx="21" ry="8" /><ellipse cx="32" cy="32" rx="8" ry="21" /><circle cx="32" cy="32" r="5" /></> },
  { key: "prism", viewBox: "0 0 64 64", element: <path d="M20 14h24l8 18-20 18L12 32Z" /> },
  { key: "comet", viewBox: "0 0 64 64", element: <><path d="M14 34h22" /><path d="M10 28h16" /><path d="M18 40h12" /><circle cx="42" cy="24" r="9" /></> },
];

const AnimatedThemeGlyph = ({ open }: { open: boolean }) => {
  const [shapeIndex, setShapeIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setShapeIndex((value) => (value + 1) % SHAPES.length), 1400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative z-10 flex h-10 w-10 items-center justify-center md:h-11 md:w-11" data-testid="theme-bubble-glyph">
      <span className="absolute inset-0 rounded-full border border-white/30 bg-white/[0.08] backdrop-blur-2xl" style={{ boxShadow: open ? "0 0 24px rgba(56,189,248,0.38), 0 0 48px rgba(232,121,249,0.32), inset 0 1px 0 rgba(255,255,255,0.22)" : "0 0 18px rgba(56,189,248,0.28), 0 0 34px rgba(232,121,249,0.22), inset 0 1px 0 rgba(255,255,255,0.18)" }} />
      <span className="absolute inset-[3px] rounded-full opacity-95" style={{ background: "conic-gradient(from 0deg,var(--theme-neon-a),var(--theme-neon-b),var(--theme-neon-c),var(--theme-neon-a))", filter: "blur(8px)", animation: "lovanet-glyph-spin 8s linear infinite" }} />
      <span className="absolute inset-[6px] rounded-full border border-white/10 bg-[rgba(8,10,20,0.84)]" />
      {SHAPES.map((shape, index) => (
        <svg
          key={shape.key}
          viewBox={shape.viewBox}
          className="absolute h-7 w-7 transition-[transform,opacity,filter] duration-700"
          style={{
            opacity: shapeIndex === index ? 1 : 0,
            transform: `scale(${shapeIndex === index ? 1 : 0.72}) rotate(${shapeIndex === index ? 0 : -16}deg)`,
            filter: shapeIndex === index ? "drop-shadow(0 0 10px rgba(255,255,255,0.6)) drop-shadow(0 0 16px rgba(56,189,248,0.38))" : "none",
          }}
          fill="none"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {shape.element}
        </svg>
      ))}
      <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-white/90" />
    </div>
  );
};

const moodFilters: { key: ThemeMood; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "neon", label: "Électrique" },
  { key: "glass", label: "Glass" },
  { key: "cyber", label: "Cyber" },
  { key: "glacier", label: "Glacier" },
  { key: "pearl", label: "Pearl" },
  { key: "prism", label: "Prism" },
  { key: "mono", label: "Mono" },
];

export const ThemeBubble = () => {
  const [open, setOpen] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState(DEFAULT_THEME_ID);
  const [tab, setTab] = useState("all");
  const [mood, setMood] = useState<ThemeMood>("all");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [navMode, setNavMode] = useState<NavPreviewMode>("derived");

  const activeTheme = useMemo(
    () => THEME_CATALOG.find((theme) => theme.id === activeThemeId) ?? THEME_CATALOG[0],
    [activeThemeId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    const savedTheme = null;
    const savedNavMode = typeof window !== "undefined" ? window.localStorage.getItem(NAV_MODE_KEY) : null;
    const mode = NAV_PREVIEW_MODES.some((item) => item.id === savedNavMode) ? (savedNavMode as NavPreviewMode) : "derived";
    const theme = THEME_CATALOG.find((item) => item.id === savedTheme) ?? THEME_CATALOG.find((item) => item.id === DEFAULT_THEME_ID) ?? THEME_CATALOG[0];
    applyTheme(theme, mode);
    setActiveThemeId(theme.id);
    setNavMode(mode);
    setFavorites(readStoredArray(FAVORITES_KEY));
    setRecents(readStoredArray(RECENTS_KEY));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  }, [recents]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(NAV_MODE_KEY, navMode);
    applyNavTheme(activeTheme, navMode);
  }, [activeTheme, navMode]);

  const filteredByTab = useMemo(() => {
    if (tab === "favorites") {
      return THEME_CATALOG.filter((theme) => favorites.includes(theme.id));
    }
    if (tab === "recent") {
      const order = new Map(recents.map((id, index) => [id, index]));
      return THEME_CATALOG
        .filter((theme) => order.has(theme.id))
        .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
    }
    return THEME_CATALOG;
  }, [favorites, recents, tab]);

  const visibleThemes = useMemo(() => {
    const search = normalize(query);
    return filteredByTab.filter((theme) => {
      const moodMatch = mood === "all" || theme.mood === mood;
      const searchMatch = !search || normalize([theme.label, theme.family, theme.finish, theme.variant, ...theme.tags].join(" ")).includes(search);
      return moodMatch && searchMatch;
    });
  }, [filteredByTab, mood, query]);

  const updateRecents = (themeId: string) => {
    setRecents((previous) => [themeId, ...previous.filter((id) => id !== themeId)].slice(0, RECENT_LIMIT));
  };

  const handleApplyTheme = (theme: ThemeOption, notify = true) => {
    applyTheme(theme, navMode);
    setActiveThemeId(theme.id);
    updateRecents(theme.id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme.id);
    }
    if (notify) {
      toast.success(`Thème appliqué : ${theme.label}`, {
        description: `${theme.family} · ${theme.variant} · ${theme.finish}`,
      });
    }
  };

  const handleToggleFavorite = (themeId: string) => {
    setFavorites((previous) =>
      previous.includes(themeId) ? previous.filter((id) => id !== themeId) : [themeId, ...previous].slice(0, 32),
    );
  };

  const handleRandomTheme = () => {
    const pool = visibleThemes.length > 0 ? visibleThemes : THEME_CATALOG;
    const randomTheme = pool[Math.floor(Math.random() * pool.length)];
    handleApplyTheme(randomTheme);
  };

  const handleResetTheme = () => {
    const fallback = THEME_CATALOG.find((theme) => theme.id === DEFAULT_THEME_ID) ?? THEME_CATALOG[0];
    handleApplyTheme(fallback);
    setMood("all");
    setQuery("");
    setTab("all");
    setNavMode("derived");
  };

  const navPreviewStyles = useMemo(() => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--nav-theme-accent") || activeTheme.primaryHex;
    const accent2 = getComputedStyle(document.documentElement).getPropertyValue("--nav-theme-accent-2") || activeTheme.accentHex;
    const accent3 = getComputedStyle(document.documentElement).getPropertyValue("--nav-theme-accent-3") || activeTheme.tertiaryHex;
    return {
      background: `linear-gradient(135deg, ${accent}, ${accent2}, ${accent3})`,
    };
  }, [activeTheme, navMode, open]);

  const panelBody = (
    <div className="theme-orb-panel flex h-full flex-col overflow-hidden bg-black/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-[2rem]" data-testid="theme-bubble-panel">
      <div className="theme-orb-panel-highlight" aria-hidden="true" />
      <div className="relative flex h-full flex-col">
        <div className="border-b border-white/5 px-4 pb-3 pt-4 md:px-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-medium text-white/90 bg-white/10 border border-white/20">
              <Sparkles className="h-3.5 w-3.5" style={{ color: activeTheme.primaryHex }} />
              <span data-testid="theme-active-label" className="max-w-[120px] truncate">{activeTheme.label}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
                <Button type="button" variant="ghost" size="icon" onClick={handleRandomTheme} className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white" title="Thème aléatoire">
                  <Shuffle className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={handleResetTheme} className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white" title="Réinitialiser">
                  <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un style..."
              className="theme-search-input h-10 rounded-xl bg-white/5 border-white/10 pl-9 pr-4 text-[13px] text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
              data-testid="theme-search-input"
            />
          </div>

          <ScrollArea className="w-full whitespace-nowrap pb-1">
            <div className="flex w-max space-x-2">
              {moodFilters.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMood(option.key)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-all",
                    mood === option.key 
                      ? "bg-white text-black shadow-md" 
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                  data-testid={`theme-mood-filter-${option.key}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 md:px-5">
          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col" data-testid="theme-tabs-root">
            <TabsList className="grid h-10 grid-cols-3 rounded-xl bg-white/5 p-1 mb-3">
              <TabsTrigger value="all" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Tous</TabsTrigger>
              <TabsTrigger value="favorites" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Favoris</TabsTrigger>
              <TabsTrigger value="recent" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">Récents</TabsTrigger>
            </TabsList>

            <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {NAV_PREVIEW_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setNavMode(mode.id);
                      applyNavTheme(activeTheme, mode.id);
                    }}
                    className={cn(
                      "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors border",
                      navMode === mode.id 
                        ? "bg-white/10 text-white border-white/20" 
                        : "bg-transparent text-white/50 border-transparent hover:bg-white/5 hover:text-white/80"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {(["all", "favorites", "recent"] as const).map((currentTab) => (
              <TabsContent key={currentTab} value={currentTab} className="mt-0 min-h-0 flex-1">
                <ScrollArea className="h-[45vh] pr-3 md:h-[calc(100vh-22rem)]">
                  {visibleThemes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      {visibleThemes.map((theme) => {
                        const isActive = theme.id === activeThemeId;
                        const isFavorite = favorites.includes(theme.id);
                        return (
                          <article
                            key={theme.id}
                            className={cn(
                              "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-300",
                              isActive 
                                ? "border-white/40 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
                                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                            )}
                            onClick={() => handleApplyTheme(theme)}
                            data-testid={`theme-swatch-card-${theme.id}`}
                          >
                            <div className="h-16 w-full relative" style={{ background: theme.swatch }}>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                              
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(theme.id); }}
                                className="absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-md transition-colors hover:bg-white/20"
                                aria-label={isFavorite ? `Retirer ${theme.label} des favoris` : `Ajouter ${theme.label} aux favoris`}
                              >
                                <Star className={cn("h-3.5 w-3.5", isFavorite ? "fill-yellow-400 text-yellow-400" : "text-white/70")} />
                              </button>
                            </div>

                            <div className="flex flex-1 flex-col gap-1.5 p-3">
                              <h4 className="text-[13px] font-bold text-white line-clamp-1 flex items-center justify-between">
                                {theme.label}
                                {isActive && <Check className="h-3 w-3 text-green-400" />}
                              </h4>
                              <p className="text-[10px] uppercase tracking-widest text-white/50">
                                {theme.family}
                              </p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center text-center opacity-60">
                      <Search className="mb-2 h-6 w-6" />
                      <p className="text-sm font-medium">Aucun style trouvé</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le sélecteur de thèmes"
        data-testid="theme-bubble-toggle"
        className="theme-orb-button fixed bottom-4 left-3 z-[9999] h-[52px] w-[52px] rounded-full p-0 shadow-[0_0_20px_rgba(var(--theme-primary-rgb),0.4)] sm:left-4 md:bottom-6 md:left-6 md:h-16 md:w-16"
      >
        <span className="theme-orb-halo" aria-hidden="true" />
        <span className="theme-orb-core" aria-hidden="true" />
        <AnimatedThemeGlyph open={open} />
      </Button>

      {!isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-full max-w-[480px] border-none bg-transparent p-3 shadow-none sm:max-w-[480px]" data-testid="theme-desktop-sheet">
            <SheetHeader className="sr-only">
              <SheetTitle>Catalogue des thèmes</SheetTitle>
              <SheetDescription>Sélection de thèmes premium Lovanet.</SheetDescription>
            </SheetHeader>
            {panelBody}
          </SheetContent>
        </Sheet>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh] border-none bg-transparent px-2 pb-2 shadow-none" data-testid="theme-mobile-drawer">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Catalogue des thèmes</DrawerTitle>
              <DrawerDescription>Sélection de thèmes premium Lovanet.</DrawerDescription>
            </DrawerHeader>
            {panelBody}
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default ThemeBubble;
