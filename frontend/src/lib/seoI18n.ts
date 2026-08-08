// SEO i18n dictionary — controls the title / description / og:* that Google
// serves in the SERP snippet for each supported UI language. Selection is
// driven by `?hl=<code>` (explicit) or `navigator.language` (implicit).

export const SUPPORTED_LOCALES = ["fr", "en", "es", "de", "it", "pt", "ja", "zh"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export type RouteKey =
  | "/"
  | "/anime-moments"
  | "/decouvrir"
  | "/shop"
  | "/anime-catalog"
  | "/anime-countdown"
  | "/chaine-youtube"
  | "/lecteurs-video"
  | "/prime-video"
  | "/tiktok"
  | "/actualites"
  | "/leaderboard"
  | "/profile"
  | "/login"
  | "/contact"
  | "/legals";

export const ROUTES: RouteKey[] = [
  "/",
  "/anime-moments",
  "/decouvrir",
  "/shop",
  "/anime-catalog",
  "/anime-countdown",
  "/chaine-youtube",
  "/lecteurs-video",
  "/prime-video",
  "/tiktok",
  "/actualites",
  "/leaderboard",
  "/profile",
  "/login",
  "/contact",
  "/legals",
];

type Meta = { title: string; description: string };

// Route-level snippets used by search engines for each service page.
const ROUTE_DESCRIPTIONS: Record<RouteKey, string> = {
  "/": "Anime.Moments.officiel : Lovanet plateforme officielle avec boutique manga, vidéos YouTube, TikTok, Prime Video, catalogue anime et accès compte client.",
  "/anime-moments": "Anime Moments : page officielle avec sélections vidéo, aperçus, nouveautés et accès direct aux services Lovanet.",
  "/decouvrir": "Découvrir Lovanet : entrée rapide vers les vidéos, la boutique, le catalogue, les actualités et les services du compte.",
  "/shop": "Boutique Lovanet : posters, collectors, vêtements et produits manga, avec accès panier et parcours client.",
  "/anime-catalog": "Catalogue anime Lovanet : fiches, trailers et recherche de titres pour explorer les séries et films.",
  "/anime-countdown": "Anime à venir : calendrier et compte à rebours des prochaines sorties d'épisodes et de saisons.",
  "/chaine-youtube": "Chaîne YouTube Anime.Moments.officiel : vidéos officielles, extraits, shorts et nouveautés anime.",
  "/lecteurs-video": "Lecteur vidéo Lovanet : lecture locale, modules 3D et navigation premium des contenus vidéo.",
  "/prime-video": "Prime Video Anime.Moments.officiel : sélection d'anime, lecture continue et recommandations par univers.",
  "/tiktok": "TikTok Anime.Moments.officiel : shorts anime, réactions rapides et bibliothèque verticale officielle.",
  "/actualites": "Actualités Lovanet : annonces, nouveautés vidéo, sorties produits et informations de la plateforme.",
  "/leaderboard": "Classement Lovanet : top membres, points, progression et activités de la communauté.",
  "/profile": "Espace client Lovanet : profil, préférences, favoris et paramètres de compte utilisateur.",
  "/login": "Connexion Lovanet : accès sécurisé à votre compte, à vos favoris et à vos services personnalisés.",
  "/contact": "Contact Lovanet : support, assistance compte, demandes boutique et informations générales.",
  "/legals": "Mentions légales Lovanet : informations éditeur, conditions d'utilisation et politique de confidentialité.",
};

// Titles use " : " as separator (never em-dash). Homepage title matches the
// exact wording requested by the brand.
const TITLES: Record<Locale, Record<RouteKey, string>> = {
  fr: {
    "/": "Lovanet : portail anime manga officiel",
    "/anime-moments": "Anime.Moments.officiel : page officielle Lovanet",
    "/decouvrir": "Discover Lovanet : Univers anime, vidéos et boutique",
    "/shop": "Boutique Lovanet : Posters, collectors et vêtements anime",
    "/anime-catalog": "Catalogue Anime : 1500+ animés avec trailers",
    "/anime-countdown": "Anime à venir : Countdown live des sorties",
    "/chaine-youtube": "YouTube : AnimeMoments chaîne officielle anime",
    "/lecteurs-video": "Lecteur vidéo : Lovanet anime player",
    "/prime-video": "Prime Video : Anime.Moments.officiel streaming",
    "/tiktok": "TikTok : Anime.Moments.officiel shorts anime",
    "/actualites": "Actualités Anime : nouveautés vidéos, produits et manga",
    "/leaderboard": "Leaderboard : Classement Lovanet",
    "/profile": "Espace client : Profil Lovanet",
    "/login": "Connexion : Compte Lovanet",
    "/contact": "Contact : Lovanet Anime.Moments.officiel",
    "/legals": "Mentions légales : Lovanet Anime.Moments.officiel",
  },
  en: {
    "/": "Lovanet : official anime manga portal",
    "/anime-moments": "Anime.Moments.officiel : official Lovanet page",
    "/decouvrir": "Discover Lovanet : anime universe, videos and shop",
    "/shop": "Lovanet Shop : anime posters, collectors and apparel",
    "/anime-catalog": "Anime Catalog : 1500+ shows with trailers",
    "/anime-countdown": "Upcoming Anime : Live release countdown",
    "/chaine-youtube": "YouTube : AnimeMoments official anime channel",
    "/lecteurs-video": "Video Player : Lovanet anime player",
    "/prime-video": "Prime Video : Anime.Moments.officiel streaming",
    "/tiktok": "TikTok : Anime.Moments.officiel anime shorts",
    "/actualites": "Anime News : videos, products and manga updates",
    "/leaderboard": "Leaderboard : Lovanet ranking",
    "/profile": "Client Area : Lovanet profile",
    "/login": "Sign in : Lovanet account",
    "/contact": "Contact : Lovanet Anime.Moments.officiel",
    "/legals": "Legal notice : Lovanet Anime.Moments.officiel",
  },
  es: {
    "/": "Lovanet : portal oficial de anime y manga",
    "/anime-moments": "Anime.Moments.officiel : página oficial Lovanet",
    "/decouvrir": "Discover Lovanet : universo anime, vídeos y tienda",
    "/shop": "Tienda Lovanet : pósteres, coleccionables y ropa anime",
    "/anime-catalog": "Catálogo Anime : 1500+ series con tráilers",
    "/anime-countdown": "Próximos anime : cuenta atrás en directo",
    "/chaine-youtube": "YouTube : AnimeMoments canal oficial anime",
    "/lecteurs-video": "Reproductor : Lovanet anime player",
    "/prime-video": "Prime Video : Anime.Moments.officiel streaming",
    "/tiktok": "TikTok : Anime.Moments.officiel shorts anime",
    "/actualites": "Noticias Anime : novedades de vídeos, productos y manga",
    "/leaderboard": "Leaderboard : clasificación Lovanet",
    "/profile": "Área cliente : perfil Lovanet",
    "/login": "Iniciar sesión : cuenta Lovanet",
    "/contact": "Contacto : Lovanet Anime.Moments.officiel",
    "/legals": "Aviso legal : Lovanet Anime.Moments.officiel",
  },
  de: {
    "/": "Lovanet : offizielles Anime- und Manga-Portal",
    "/anime-moments": "Anime.Moments.officiel : offizielle Lovanet-Seite",
    "/decouvrir": "Discover Lovanet : Anime-Universum, Videos und Shop",
    "/shop": "Lovanet Shop : Anime-Poster, Sammlerstuecke und Kleidung",
    "/anime-catalog": "Anime-Katalog : 1500+ Serien mit Trailern",
    "/anime-countdown": "Kommende Anime : Live-Countdown",
    "/chaine-youtube": "YouTube : AnimeMoments offizieller Anime-Kanal",
    "/lecteurs-video": "Videoplayer : Lovanet Anime Player",
    "/prime-video": "Prime Video : Anime.Moments.officiel Streaming",
    "/tiktok": "TikTok : Anime.Moments.officiel Anime-Shorts",
    "/actualites": "Anime News : Videos, Produkte und Manga Updates",
    "/leaderboard": "Leaderboard : Lovanet Rangliste",
    "/profile": "Kundenbereich : Lovanet Profil",
    "/login": "Anmeldung : Lovanet Konto",
    "/contact": "Kontakt : Lovanet Anime.Moments.officiel",
    "/legals": "Impressum : Lovanet Anime.Moments.officiel",
  },
  it: {
    "/": "Lovanet : portale ufficiale anime e manga",
    "/anime-moments": "Anime.Moments.officiel : pagina ufficiale Lovanet",
    "/decouvrir": "Discover Lovanet : universo anime, video e shop",
    "/shop": "Shop Lovanet : poster, collector e abbigliamento anime",
    "/anime-catalog": "Catalogo Anime : 1500+ serie con trailer",
    "/anime-countdown": "Anime in arrivo : countdown live",
    "/chaine-youtube": "YouTube : AnimeMoments canale ufficiale anime",
    "/lecteurs-video": "Player video : Lovanet anime player",
    "/prime-video": "Prime Video : Anime.Moments.officiel streaming",
    "/tiktok": "TikTok : Anime.Moments.officiel shorts anime",
    "/actualites": "News Anime : novità video, prodotti e manga",
    "/leaderboard": "Leaderboard : classifica Lovanet",
    "/profile": "Area cliente : profilo Lovanet",
    "/login": "Accesso : account Lovanet",
    "/contact": "Contatti : Lovanet Anime.Moments.officiel",
    "/legals": "Note legali : Lovanet Anime.Moments.officiel",
  },
  pt: {
    "/": "Lovanet : portal oficial de anime e manga",
    "/anime-moments": "Anime.Moments.officiel : página oficial Lovanet",
    "/decouvrir": "Discover Lovanet : universo anime, vídeos e loja",
    "/shop": "Loja Lovanet : pôsteres, colecionáveis e roupas anime",
    "/anime-catalog": "Catálogo Anime : 1500+ séries com trailers",
    "/anime-countdown": "Próximos anime : contagem regressiva ao vivo",
    "/chaine-youtube": "YouTube : AnimeMoments canal oficial anime",
    "/lecteurs-video": "Player de vídeo : Lovanet anime player",
    "/prime-video": "Prime Video : Anime.Moments.officiel streaming",
    "/tiktok": "TikTok : Anime.Moments.officiel shorts anime",
    "/actualites": "Notícias Anime : novidades de vídeos, produtos e manga",
    "/leaderboard": "Leaderboard : ranking Lovanet",
    "/profile": "Área do cliente : perfil Lovanet",
    "/login": "Entrar : conta Lovanet",
    "/contact": "Contato : Lovanet Anime.Moments.officiel",
    "/legals": "Aviso legal : Lovanet Anime.Moments.officiel",
  },
  ja: {
    "/": "Lovanet : 公式アニメ・マンガポータル",
    "/anime-moments": "Anime.Moments.officiel : Lovanet 公式ページ",
    "/decouvrir": "Discover Lovanet : アニメの世界・動画・ショップ",
    "/shop": "Lovanet ショップ : アニメポスター・コレクション・アパレル",
    "/anime-catalog": "アニメカタログ : 1500本以上・予告編付き",
    "/anime-countdown": "配信予定アニメ : ライブ カウントダウン",
    "/chaine-youtube": "YouTube : AnimeMoments 公式アニメチャンネル",
    "/lecteurs-video": "動画プレイヤー : Lovanet anime player",
    "/prime-video": "Prime Video : Anime.Moments.officiel 配信",
    "/tiktok": "TikTok : Anime.Moments.officiel アニメショート",
    "/actualites": "アニメニュース : 動画・商品・マンガ最新情報",
    "/leaderboard": "Leaderboard : Lovanet ランキング",
    "/profile": "会員ページ : Lovanet プロフィール",
    "/login": "ログイン : Lovanet アカウント",
    "/contact": "お問い合わせ : Lovanet Anime.Moments.officiel",
    "/legals": "法的通知 : Lovanet Anime.Moments.officiel",
  },
  zh: {
    "/": "Lovanet : 官方动漫漫画门户",
    "/anime-moments": "Anime.Moments.officiel : Lovanet 官方页面",
    "/decouvrir": "Discover Lovanet : 动漫世界、视频与商店",
    "/shop": "Lovanet 商店 : 动漫海报、收藏品与服饰",
    "/anime-catalog": "动漫目录 : 1500+ 部作品含预告",
    "/anime-countdown": "即将上线动漫 : 实时倒计时",
    "/chaine-youtube": "YouTube : AnimeMoments 官方动漫频道",
    "/lecteurs-video": "视频播放器 : Lovanet anime player",
    "/prime-video": "Prime Video : Anime.Moments.officiel 流媒体",
    "/tiktok": "TikTok : Anime.Moments.officiel 动漫短片",
    "/actualites": "动漫新闻 : 视频、商品与漫画更新",
    "/leaderboard": "Leaderboard : Lovanet 排行榜",
    "/profile": "用户空间 : Lovanet 个人资料",
    "/login": "登录 : Lovanet 账户",
    "/contact": "联系我们 : Lovanet Anime.Moments.officiel",
    "/legals": "法律声明 : Lovanet Anime.Moments.officiel",
  },
};

function buildLocale(locale: Locale): Record<RouteKey, Meta> {
  const out = {} as Record<RouteKey, Meta>;
  for (const r of ROUTES) out[r] = { title: TITLES[locale][r], description: ROUTE_DESCRIPTIONS[r] };
  return out;
}

export const SEO_I18N: Record<Locale, Record<RouteKey, Meta>> = {
  fr: buildLocale("fr"),
  en: buildLocale("en"),
  es: buildLocale("es"),
  de: buildLocale("de"),
  it: buildLocale("it"),
  pt: buildLocale("pt"),
  ja: buildLocale("ja"),
  zh: buildLocale("zh"),
};

export const HREFLANG_MAP: Record<Locale, string> = {
  fr: "fr", en: "en", es: "es", de: "de", it: "it", pt: "pt", ja: "ja", zh: "zh",
};

export function detectLocale(search: string, navLang: string | undefined): Locale {
  const params = new URLSearchParams(search);
  const hl = params.get("hl")?.toLowerCase();
  if (hl && (SUPPORTED_LOCALES as readonly string[]).includes(hl)) return hl as Locale;
  const nav = (navLang || "").slice(0, 2).toLowerCase();
  if ((SUPPORTED_LOCALES as readonly string[]).includes(nav)) return nav as Locale;
  return DEFAULT_LOCALE;
}

export function normalizeRoute(pathname: string): RouteKey {
  let key = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  const parts = key.split("/").filter(Boolean);
  if (parts.length > 0 && (SUPPORTED_LOCALES as readonly string[]).includes(parts[0].toLowerCase())) {
    key = "/" + parts.slice(1).join("/");
    if (key === "/") return "/";
  }
  if (key.startsWith("/actualites/")) return "/actualites";
  return (ROUTES.includes(key as RouteKey) ? (key as RouteKey) : "/");
}

export function localeFromPathname(pathname: string): Locale | null {
  const parts = pathname.split("?")[0].split("/").filter(Boolean);
  const first = parts[0]?.toLowerCase();
  if (first && (SUPPORTED_LOCALES as readonly string[]).includes(first)) return first as Locale;
  return null;
}

export function metaFor(locale: Locale, route: RouteKey): Meta {
  return SEO_I18N[locale][route] ?? SEO_I18N[DEFAULT_LOCALE][route];
}
