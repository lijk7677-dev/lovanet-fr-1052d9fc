import { useEffect, useMemo, useState } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/youtubeEmbed";
import { Helmet } from "react-helmet-async";
import { PageShell } from "@/components/PageShell";
import { HubEmbedFrame } from "@/components/HubEmbedFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Product360Viewer } from "@/components/Product360Viewer";
import { ProductArtwork } from "@/components/ProductArtwork";
import { SHOP_CATEGORIES, type ShopProduct, type ShopCategory, categoryLabel } from "@/data/shopProducts";
import { ALL_PRODUCTS, loadManualProducts, loadHiddenIds, saveHiddenIds } from "@/data/generatedProducts";
import { DropshipAdminPanel } from "@/components/DropshipAdminPanel";
import { ShopHeroBanner } from "@/components/ShopHeroBanner";
import { useCart } from "@/context/CartContext";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Search, Star, Flame, ShoppingCart, ChevronLeft, ChevronRight, Sparkles, Zap, EyeOff, ExternalLink, Play, Heart, LayoutGrid, Package, Gamepad2 } from "lucide-react";
import { videos as VIDEO_LIST } from "@/data/videos";
import { WidgetDock, wishlistApi, recentApi } from "@/components/shop/WidgetDock";

import { useGamification } from "@/contexts/GamificationContext";
import { CyberRadarTracker } from "@/components/shop/CyberRadarTracker";
const PAGE_SIZE = 40;
const DEFAULT_SHOP_ORIGIN = "https://lovanet.fr";
const SOURCE_LABEL: Record<ShopProduct["source"], string> = {
  youtube: "YouTube drop",
  tiktok: "TikTok drop",
  both: "YouTube + TikTok",
};

const MarqueeRail = ({
  title,
  icon,
  items,
  onOpen,
  duration = 60,
}: {
  title: string;
  icon: React.ReactNode;
  items: ShopProduct[];
  onOpen: (p: ShopProduct) => void;
  duration?: number;
}) => {
  const loop = [...items, ...items];
  return (
    <section className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
      <header className="flex items-center gap-2 mb-2 sm:mb-3">
        {icon}
        <h2 className="font-display font-bold text-base sm:text-xl">{title}</h2>
        <span className="ml-auto text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">Défile auto →</span>
      </header>
      <div className="marquee-viewport overflow-hidden [perspective:1200px]">
        <div className="marquee-track gap-2 sm:gap-3" style={{ ["--marquee-duration" as string]: `${duration}s` }}>
          {loop.map((p, i) => (
            <button
              key={`${p.id}-${i}`}
              onClick={() => onOpen(p)}
              className="shrink-0 w-36 sm:w-44 lg:w-48 rounded-2xl border border-border/60 bg-card overflow-hidden text-left hover:border-primary/60 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_hsl(var(--neon-magenta)/0.7)] hover:[transform:translateY(-4px)_rotateX(4deg)_rotateY(-4deg)] transition-all duration-300"
            >
              <div className="relative aspect-square">
                <ProductArtwork seed={p.id} category={p.category} label={p.name} />
                {p.compareAt && p.compareAt > p.price && (
                  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">
                    -{Math.round((1 - p.price / p.compareAt) * 100)}%
                  </span>
                )}
                {p.video && (
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-background/80 backdrop-blur">
                    <Play className="w-3 h-3" /> Vidéo
                  </span>
                )}
              </div>
              <div className="p-2 sm:p-2.5">
                <p className="text-[10px] sm:text-[11px] font-medium line-clamp-2 min-h-[2rem] sm:min-h-[2.2rem]">{p.name}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="font-display font-bold text-primary text-sm">{p.price} {p.currency === 'LC' ? 'LC' : '€'}</p>
                  {p.compareAt && p.compareAt > p.price && (
                    <span className="text-[10px] text-muted-foreground line-through">{p.compareAt} {p.currency === 'LC' ? 'LC' : '€'}</span>
                  )}
                </div>
                {p.rating != null && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{p.rating} · {(p.sold ?? 0).toLocaleString()} vendus</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

const Shop = () => {
  const { incrementEpic } = useGamification();
  const isAdmin = useIsAdmin();
  const { add, setOpen: openCart, count } = useCart();
  const [manual, setManual] = useState<ShopProduct[]>(() => loadManualProducts());
  const [hidden, setHidden] = useState<string[]>(() => loadHiddenIds());
  const [filter, setFilter] = useState<ShopCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"pop" | "asc" | "desc" | "rating">("pop");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<ShopProduct | null>(null);
  const [wl, setWl] = useState<string[]>(() => wishlistApi.get());
  useEffect(() => {
    const h = () => setWl(wishlistApi.get());
    window.addEventListener("shop:wishlist-changed", h);
    return () => window.removeEventListener("shop:wishlist-changed", h);
  }, []);
  const openProduct = (p: ShopProduct) => { 

    recentApi.push(p.id); 
    setActive(p); 
    incrementEpic("shop_explore", 1);
  };

  const products = useMemo(() => {
    const hset = new Set(hidden);
    return [...manual, ...ALL_PRODUCTS].filter((p) => !hset.has(p.id));
  }, [manual, hidden]);

  // ensure uniqueness by id (safety)
  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = uniqueProducts;
    if (filter !== "all") list = list.filter((p) => p.category === filter);
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q));
    if (sort === "asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return list;
  }, [uniqueProducts, filter, query, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filter, query, sort]);

  const flashDeals = useMemo(
    () => uniqueProducts.filter((p) => p.compareAt && p.compareAt > p.price).slice(0, 16),
    [uniqueProducts]
  );
  const bestSellers = useMemo(
    () => [...uniqueProducts].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)).slice(0, 16),
    [uniqueProducts]
  );
  const newArrivals = useMemo(() => uniqueProducts.slice(-16).reverse(), [uniqueProducts]);
  const digitalPicks = useMemo(
    () => uniqueProducts.filter((p) => p.type === "digital" || p.category === "music").slice(0, 16),
    [uniqueProducts]
  );
  const heroProducts = useMemo(() => bestSellers.slice(0, 5), [bestSellers]);
  const heroVideoIds = useMemo(() => VIDEO_LIST.slice(0, 4).map((v) => v.id), []);

  const hide = (id: string) => {
    const next = Array.from(new Set([...hidden, id]));
    setHidden(next);
    saveHiddenIds(next);
  };

  const shopStructuredData = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : DEFAULT_SHOP_ORIGIN;
    const fallbackImage = `${origin}/lovanet-og.svg`;
    const shopImage = fallbackImage;
    const shippingDestination = {
      "@type": "DefinedRegion",
      addressCountry: "FR",
    };
    const merchantReturnPolicy = {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "FR",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
      refundType: "https://schema.org/FullRefund",
      inStoreReturnsOffered: false,
    };

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: "Boutique AnimemomentsAnimeofficiel",
          url: `${origin}/shop`,
          image: shopImage,
          description: "Boutique Lovanet avec produits anime, manga et culture pop japonaise.",
          mainEntity: {
            "@id": `${origin}/shop#item-list`,
          },
        },
        {
          "@type": "ItemList",
          "@id": `${origin}/shop#item-list`,
          name: "Boutique AnimemomentsAnimeofficiel",
          numberOfItems: uniqueProducts.length,
          itemListElement: uniqueProducts.slice(0, 200).map((p, i) => {
            const ratingValue = Number((p.rating ?? 4.7).toFixed(1));
            const reviewCount = p.reviews ?? Math.max(12, Math.round((p.sold ?? 100) / 4));
            const productImage = p.id.startsWith("am-") ? `${origin}/products/${p.id}.svg` : fallbackImage;
            const productUrl = `${origin}/shop#${p.id}`;
            const brandName = p.brand ?? "AnimemomentsAnimeofficiel";
            const mpn = `${p.id.toUpperCase()}-${String(p.category).toUpperCase()}`;
            const stockCount = p.stock ?? 25;
            const availability = stockCount > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
            const shippingRate = p.type === "digital" ? "0.00" : p.price >= 79 ? "0.00" : "4.90";
            const handlingMin = p.type === "digital" ? 0 : 1;
            const handlingMax = p.type === "digital" ? 0 : 2;
            const transitMin = p.type === "digital" ? 0 : 2;
            const transitMax = p.type === "digital" ? 0 : 7;

            return {
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                "@id": productUrl,
                sku: p.id,
                mpn,
                productID: p.id,
                name: p.name,
                description: p.description,
                category: categoryLabel(p.category),
                brand: { "@type": "Brand", name: brandName },
                image: [productImage, fallbackImage],
                url: productUrl,
                itemCondition: "https://schema.org/NewCondition",
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: `${ratingValue}`,
                  reviewCount: `${reviewCount}`,
                  ratingCount: `${reviewCount}`,
                  bestRating: "5",
                  worstRating: "1",
                },
                review: [
                  {
                    "@type": "Review",
                    name: `Avis client ${p.name}`,
                    reviewBody: p.description,
                    reviewRating: { "@type": "Rating", ratingValue: `${ratingValue}`, bestRating: "5", worstRating: "1" },
                    author: { "@type": "Organization", name: "Lovanet" },
                    publisher: { "@type": "Organization", name: "Lovanet" },
                    positiveNotes: p.bullets?.slice(0, 3) ?? [],
                  },
                ],
                offers: {
                  "@type": "Offer",
                  priceCurrency: "EUR",
                  price: p.price.toFixed(2),
                  availability,
                  inventoryLevel: {
                    "@type": "QuantitativeValue",
                    value: stockCount,
                  },
                  url: productUrl,
                  seller: { "@type": "Organization", name: "Lovanet" },
                  itemCondition: "https://schema.org/NewCondition",
                  shippingDetails: {
                    "@type": "OfferShippingDetails",
                    shippingDestination,
                    deliveryTime: {
                      "@type": "ShippingDeliveryTime",
                      handlingTime: {
                        "@type": "QuantitativeValue",
                        minValue: handlingMin,
                        maxValue: handlingMax,
                        unitCode: "DAY",
                      },
                      transitTime: {
                        "@type": "QuantitativeValue",
                        minValue: transitMin,
                        maxValue: transitMax,
                        unitCode: "DAY",
                      },
                    },
                    shippingRate: {
                      "@type": "MonetaryAmount",
                      value: shippingRate,
                      currency: "EUR",
                    },
                  },
                  hasMerchantReturnPolicy: merchantReturnPolicy,
                },
              },
            };
          }),
        },
      ],
    };
  }, [uniqueProducts]);

  const addToCart = (p: ShopProduct) => {
    add({ id: p.id, name: p.name, price: p.price, category: categoryLabel(p.category) });
    incrementEpic("shop_add_cart", 1);
    openCart(true);
  };

  return (
    <PageShell>
      <Helmet>
        <title>Boutique — Lovanet · Anime.Moments.officiel & AnimemomentsAnimeofficiel</title>
        <script type="application/ld+json">{JSON.stringify(shopStructuredData)}</script>
      </Helmet>
      <section className="container mx-auto px-3 sm:px-4 lg:px-8 pt-6 sm:pt-8 pb-5" data-testid="shop-train-station-hub-section">
        <HubEmbedFrame
          src="/hub/train-station"
          title="Hub Train Station"
          heightClassName="h-[620px] md:h-[780px]"
          testId="shop-train-station-hub"
        />
      </section>

      {/* HERO BANNER auto-slide (image + vidéo) */}
      <ShopHeroBanner
        products={heroProducts}
        videoIds={heroVideoIds}
        onOpen={openProduct}
        onOpenCart={() => openCart(true)}
        cartCount={count}
      />

      {/* SUB-NAV — site dans le site */}
      <nav className="sticky top-12 z-30 border-y border-border/60 bg-background/80 backdrop-blur">
        <div className="container mx-auto px-3 sm:px-4 lg:px-8 flex items-center gap-1 overflow-x-auto no-scrollbar py-2 text-xs">
          {[
            { href: "#dashboard", label: "Tableau de bord", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { href: "#rails",     label: "Sélections",       icon: <Sparkles className="w-3.5 h-3.5" /> },
            { href: "#catalog",   label: "Catalogue",        icon: <Package className="w-3.5 h-3.5" /> },
            { href: "#games",     label: "Jouer & gagner",   icon: <Gamepad2 className="w-3.5 h-3.5" /> },
          ].map((l) => (
            <a key={l.href} href={l.href} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-card/60 hover:border-primary/60 hover:text-primary transition">
              {l.icon}{l.label}
            </a>
          ))}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-muted-foreground">{filtered.length.toLocaleString()} produits</span>
            <span className="hidden md:inline text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1 text-primary"><Heart className="w-3.5 h-3.5" /> {wl.length}</span>
          </div>
        </div>
      </nav>

      {/* WIDGET DASHBOARD */}
      <div id="dashboard" className="flex items-center gap-4 px-4 py-2">
        <WidgetDock onOpen={openProduct} />
        <CyberRadarTracker orderId="LVN-A984" />
      </div>

      {/* SEARCH BAR */}
      <section className="container mx-auto px-3 sm:px-4 lg:px-8 pt-4 sm:pt-6">
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
          <div className="relative flex-1 min-w-[180px] sm:min-w-[220px] max-w-lg">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 h-10 sm:h-11 text-sm" placeholder="Rechercher un produit, un tag…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-md border border-border bg-background px-2 sm:px-3 h-10 sm:h-11 text-xs sm:text-sm">
            <option value="pop">Populaires</option>
            <option value="rating">Mieux notés</option>
            <option value="asc">Prix ↑</option>
            <option value="desc">Prix ↓</option>
          </select>
        </div>
      </section>

      {/* CATEGORY CHIPS */}
      <section className="container mx-auto px-3 sm:px-4 lg:px-8 pb-2">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 no-scrollbar pt-3 sm:pt-4">
          {[{ id: "all" as const, label: "Tous" }, ...SHOP_CATEGORIES].map((c) => {
            const isActive = filter === c.id;
            return (
              <button key={c.id} onClick={() => setFilter(c.id as ShopCategory | "all")}
                className={`shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs uppercase tracking-wider transition-all border ${isActive ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--neon-magenta)/0.55)]" : "bg-card border-border text-muted-foreground hover:text-primary hover:border-primary/50"}`}>
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      <div id="rails">
        <MarqueeRail title="Flash Deals" icon={<Flame className="w-5 h-5 text-primary" />} items={flashDeals} onOpen={openProduct} duration={55} />
        <MarqueeRail title="Meilleures ventes" icon={<Star className="w-5 h-5 text-primary" />} items={bestSellers} onOpen={openProduct} duration={70} />
        <MarqueeRail title="Nouveautés" icon={<Sparkles className="w-5 h-5 text-primary" />} items={newArrivals} onOpen={openProduct} duration={60} />
        <MarqueeRail title="Produits numériques" icon={<Zap className="w-5 h-5 text-primary" />} items={digitalPicks} onOpen={openProduct} duration={65} />
      </div>

      {/* GRID */}
      <section id="catalog" className="container mx-auto px-3 sm:px-4 lg:px-8 pb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} produits · page {page}/{pages}
          </p>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Précédent"><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="icon" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} aria-label="Suivant"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
          {pageItems.map((p) => (
            <article key={p.id} id={p.id}
              className="rgb-card group overflow-hidden bg-card rounded-2xl">
              <button onClick={() => openProduct(p)} className="block w-full text-left">
                <figure className="rgb-frame relative aspect-square overflow-hidden m-0">
                  <div className="rgb-art absolute inset-0 group-hover:scale-110 transition-transform duration-500">
                    <ProductArtwork seed={p.id} category={p.category} label={p.name} />
                  </div>
                  {p.compareAt && p.compareAt > p.price && (
                    <span className="absolute top-2 left-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">
                      -{Math.round((1 - p.price / p.compareAt) * 100)}%
                    </span>
                  )}
                  {p.video && (
                    <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-background/80 backdrop-blur">
                      <Play className="w-3 h-3" /> Vidéo
                    </span>
                  )}
                  <span className="absolute top-2 right-2 z-10 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/70 backdrop-blur">{categoryLabel(p.category)}</span>
                </figure>
                <div className="p-3">
                  <p className="text-[11px] uppercase tracking-wider text-primary">{p.tag}</p>
                  <h3 className="font-display font-bold text-sm leading-snug line-clamp-2 min-h-[2.6rem]">{p.name}</h3>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{p.rating ?? 4.7} · {(p.sold ?? 100).toLocaleString()} vendus</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="font-display font-extrabold gradient-text text-lg">
                        {p.price} {p.currency === 'LC' ? 'LC' : '€'}
                    </p>
                    {p.compareAt && p.compareAt > p.price && (
                      <span className="text-xs text-muted-foreground line-through">{p.compareAt} {p.currency === 'LC' ? 'LC' : '€'}</span>
                    )}
                  </div>
                </div>
              </button>
              <div className="px-3 pb-3 flex gap-2">
                <Button size="sm" className="w-full rounded-full" onClick={() => addToCart(p)}>
                  <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Ajouter
                </Button>
                <Button size="icon" variant="outline"
                  className={`rounded-full h-8 w-8 shrink-0 ${wl.includes(p.id) ? "text-primary border-primary/60" : ""}`}
                  onClick={() => {
                    wishlistApi.toggle(p.id);
                    incrementEpic("shop_wishlist", 1);
                  }}
                  aria-label={wl.includes(p.id) ? "Retirer de la wishlist" : "Ajouter à la wishlist"}>
                  <Heart className={`w-3.5 h-3.5 ${wl.includes(p.id) ? "fill-current" : ""}`} />
                </Button>
                {isAdmin && (
                  <Button size="icon" variant="outline" className="rounded-full h-8 w-8 shrink-0" onClick={() => hide(p.id)} aria-label="Masquer">
                    <EyeOff className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4 mr-1" />Précédent</Button>
          <span className="text-sm text-muted-foreground px-3">Page {page} / {pages}</span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Suivant<ChevronRight className="w-4 h-4 ml-1" /></Button>
        </div>
      </section>

      {isAdmin && <DropshipAdminPanel onProductsChange={setManual} />}

      {/* DETAIL */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{active.name}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-2 items-center pt-1">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">{categoryLabel(active.category)}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary text-foreground/80">{SOURCE_LABEL[active.source]}</span>
                  {active.type === "digital" && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40">Numérique</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Product360Viewer>
                    <ProductArtwork seed={active.id} category={active.category} label={active.name} />
                  </Product360Viewer>
                  {active.video && (
                    <div className="aspect-video rounded-xl overflow-hidden border border-border">
                      <iframe
                        src={buildYouTubeEmbedUrl(active.video, { autoplay: true, muted: false, controls: true, playsInline: true, nocookie: false })}
                        title={active.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                        className="w-full h-full"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{active.rating ?? 4.7}</span>
                    <span className="text-muted-foreground">· {(active.reviews ?? 24).toLocaleString()} avis · {(active.sold ?? 100).toLocaleString()} vendus</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="font-display text-3xl font-extrabold gradient-text">{active.price} {active.currency === 'LC' ? 'LC' : '€'}</span>
                    {active.compareAt && active.compareAt > active.price && (
                      <>
                        <span className="text-muted-foreground line-through">{active.compareAt} {active.currency === 'LC' ? 'LC' : '€'}</span>
                        <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/40">
                          -{Math.round((1 - active.price / active.compareAt) * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                  <Tabs defaultValue="desc" className="mt-4">
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="desc">Description</TabsTrigger>
                      <TabsTrigger value="specs">Caractéristiques</TabsTrigger>
                      <TabsTrigger value="ship">Livraison</TabsTrigger>
                    </TabsList>
                    <TabsContent value="desc" className="mt-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{active.description}</p>
                      {active.bullets && (
                        <ul className="mt-3 text-sm space-y-1 list-disc pl-5 text-muted-foreground">
                          {active.bullets.map((b, i) => <li key={i}>{b}</li>)}
                        </ul>
                      )}
                    </TabsContent>
                    <TabsContent value="specs" className="mt-3">
                      <dl className="text-sm grid grid-cols-[max-content,1fr] gap-x-4 gap-y-1">
                        {Object.entries(active.specs ?? { Référence: active.id, Marque: active.brand ?? "AnimemomentsAnimeofficiel", Catégorie: categoryLabel(active.category), Tag: active.tag }).map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-muted-foreground">{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </TabsContent>
                    <TabsContent value="ship" className="mt-3 text-sm text-muted-foreground space-y-2">
                      <p><strong className="text-foreground">Expédition :</strong> {active.shippingDays ?? "3–7j"} · suivi inclus</p>
                      <p><strong className="text-foreground">Retour :</strong> 14 jours satisfait ou remboursé</p>
                      <p><strong className="text-foreground">Stock :</strong> {active.stock ?? 99} disponibles</p>
                    </TabsContent>
                  </Tabs>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button className="rounded-full flex-1" onClick={() => { addToCart(active); setActive(null); }}>
                      <ShoppingCart className="w-4 h-4 mr-2" /> Ajouter au panier
                    </Button>
                    {active.affiliateUrl && (
                      <a href={active.affiliateUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full border border-primary/60 text-primary px-4 py-2 text-sm hover:bg-primary/10">
                        <ExternalLink className="w-4 h-4 mr-2" /> Voir chez le partenaire
                      </a>
                    )}
                    {isAdmin && (
                      <Button variant="outline" className="rounded-full" onClick={() => { hide(active.id); setActive(null); }}>
                        <EyeOff className="w-4 h-4 mr-2" /> Masquer
                      </Button>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Réf. {active.id} · {active.tag} · Expédition {active.shippingDays ?? "3–7j"}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default Shop;
