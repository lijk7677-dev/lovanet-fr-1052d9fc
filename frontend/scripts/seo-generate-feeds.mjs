import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const FRONTEND_ROOT = ROOT.endsWith("/frontend") ? ROOT : path.join(ROOT, "frontend");
const PUBLIC_DIR = path.join(FRONTEND_ROOT, "public");
const SEO_NEWS_FILE = path.join(FRONTEND_ROOT, "src", "data", "seoNews.ts");
const SHOP_PRODUCTS_FILE = path.join(FRONTEND_ROOT, "src", "data", "shopProducts.ts");
const SITE = "https://lovanet.fr";

const CATEGORIES = [
  "poster",
  "collector",
  "apparel",
  "sneakers",
  "music",
  "manga",
  "daily",
  "lovacoins",
];

function xmlEscape(input) {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function writeText(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function parseSeoNews() {
  const raw = readText(SEO_NEWS_FILE);
  const match = raw.match(/export const SEO_NEWS\s*=\s*(\[[\s\S]*?\])\s*as const\s*;/m);
  if (!match) throw new Error("Unable to parse SEO_NEWS array");
  const data = vm.runInNewContext(`(${match[1]})`);
  if (!Array.isArray(data)) throw new Error("SEO_NEWS is not an array");
  return data;
}

function parseShopSeeds() {
  const raw = readText(SHOP_PRODUCTS_FILE);
  const regex = /\{\s*name:\s*"((?:\\.|[^"\\])*)",\s*category:\s*"([a-z]+)"[\s\S]*?price:\s*([0-9]+)[\s\S]*?description:\s*"((?:\\.|[^"\\])*)",\s*source:\s*"([a-z]+)"\s*\}/g;
  const out = [];
  let m;
  while ((m = regex.exec(raw)) !== null) {
    const name = JSON.parse(`"${m[1]}"`);
    const category = m[2];
    const price = Number(m[3]);
    const description = JSON.parse(`"${m[4]}"`);
    const source = m[5];
    out.push({ name, category, price, description, source });
  }
  return out;
}

function toIso(input) {
  const date = new Date(input || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toRfc2822(input) {
  const date = new Date(input || Date.now());
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function ensureAbsoluteUrl(url) {
  if (!url) return `${SITE}/actualites`;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${SITE}${url}`;
  return `${SITE}/${url}`;
}

function buildNewsItems(news) {
  return [...news]
    .filter((n) => n && n.slug && n.title)
    .map((n) => ({
      title: n.title,
      description: n.description || "Actualite Lovanet",
      url: ensureAbsoluteUrl(n.url || `/actualites/${n.slug}`),
      image: ensureAbsoluteUrl(n.image || "/lovanet-logo-custom.png"),
      author: n.author || "Redaction Lovanet",
      category: n.category || "actualite",
      published: toIso(n.datePublished),
      modified: toIso(n.dateModified || n.datePublished),
    }))
    .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
}

function assignProductIds(seeds) {
  const lovacoins = seeds.filter((s) => s.category === "lovacoins");
  const others = seeds.filter((s) => s.category !== "lovacoins");
  const withIds = [];

  lovacoins.forEach((item, i) => {
    withIds.push({ ...item, id: `am-lc-${String(i + 1).padStart(3, "0")}` });
  });
  others.forEach((item, i) => {
    withIds.push({ ...item, id: `am-${String(i + 1).padStart(3, "0")}` });
  });

  return withIds;
}

function buildRss(newsItems) {
  const latest = newsItems[0]?.modified || new Date().toISOString();
  const items = newsItems.slice(0, 120).map((item) => `
    <item>
      <title>${xmlEscape(item.title)}</title>
      <link>${xmlEscape(item.url)}</link>
      <guid isPermaLink="true">${xmlEscape(item.url)}</guid>
      <description>${xmlEscape(item.description)}</description>
      <pubDate>${xmlEscape(toRfc2822(item.published))}</pubDate>
      <category>${xmlEscape(item.category)}</category>
      <author>${xmlEscape(item.author)}</author>
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Lovanet Actualites</title>
    <link>${SITE}/actualites</link>
    <description>Flux actualites Lovanet: videos, boutique, services et plateforme.</description>
    <language>fr</language>
    <lastBuildDate>${toRfc2822(latest)}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

function buildAtom(newsItems) {
  const latest = newsItems[0]?.modified || new Date().toISOString();
  const items = newsItems.slice(0, 120).map((item) => `
  <entry>
    <title>${xmlEscape(item.title)}</title>
    <id>${xmlEscape(item.url)}</id>
    <updated>${xmlEscape(item.modified)}</updated>
    <published>${xmlEscape(item.published)}</published>
    <link href="${xmlEscape(item.url)}" />
    <summary>${xmlEscape(item.description)}</summary>
    <author><name>${xmlEscape(item.author)}</name></author>
  </entry>`).join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Lovanet Actualites</title>
  <id>${SITE}/actualites</id>
  <updated>${xmlEscape(latest)}</updated>
  <link href="${SITE}/atom.xml" rel="self" />
  <link href="${SITE}/actualites" />${items}
</feed>
`;
}

function buildNewsSitemap(newsItems) {
  const urls = newsItems.slice(0, 1000).map((item) => `
  <url>
    <loc>${xmlEscape(item.url)}</loc>
    <lastmod>${xmlEscape(item.modified)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildGoogleNewsSitemap(newsItems) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const urls = newsItems
    .filter((item) => new Date(item.published).getTime() >= cutoff)
    .slice(0, 500)
    .map((item) => `
  <url>
    <loc>${xmlEscape(item.url)}</loc>
    <news:news>
      <news:publication>
        <news:name>Lovanet Actualites</news:name>
        <news:language>fr</news:language>
      </news:publication>
      <news:publication_date>${xmlEscape(item.published)}</news:publication_date>
      <news:title>${xmlEscape(item.title)}</news:title>
    </news:news>
  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
}

function buildShopFeed(products) {
  const now = new Date().toUTCString();
  const items = products.slice(0, 300).map((p) => {
    const url = `${SITE}/shop?product=${encodeURIComponent(p.id)}`;
    return `
    <item>
      <title>${xmlEscape(p.name)}</title>
      <link>${xmlEscape(url)}</link>
      <guid isPermaLink="false">${xmlEscape(p.id)}</guid>
      <description>${xmlEscape(p.description)}</description>
      <category>${xmlEscape(p.category)}</category>
      <price>${xmlEscape(`${p.price} EUR`)}</price>
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Lovanet Boutique Produits</title>
    <link>${SITE}/shop</link>
    <description>Flux produits boutique Lovanet.</description>
    <language>fr</language>
    <lastBuildDate>${now}</lastBuildDate>${items}
  </channel>
</rss>
`;
}

function buildGoogleMerchantFeed(products) {
  const now = new Date().toUTCString();
  const items = products.slice(0, 1000).map((p) => {
    const url = `${SITE}/shop?product=${encodeURIComponent(p.id)}`;
    const image = `${SITE}/lovanet-logo-custom.png`;
    return `
    <item>
      <g:id>${xmlEscape(p.id)}</g:id>
      <g:title>${xmlEscape(p.name)}</g:title>
      <g:description>${xmlEscape(p.description)}</g:description>
      <g:link>${xmlEscape(url)}</g:link>
      <g:image_link>${xmlEscape(image)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${xmlEscape(`${p.price}.00 EUR`)}</g:price>
      <g:brand>Lovanet</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>222</g:google_product_category>
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Lovanet Google Merchant Feed</title>
    <link>${SITE}/shop</link>
    <description>Flux produits pour Google Merchant Center.</description>
    <lastBuildDate>${now}</lastBuildDate>${items}
  </channel>
</rss>
`;
}

function buildShopSitemap(products) {
  const categoryUrls = CATEGORIES.map((c) => `
  <url>
    <loc>${SITE}/shop?category=${c}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n");

  const productUrls = products.slice(0, 500).map((p) => `
  <url>
    <loc>${SITE}/shop?product=${encodeURIComponent(p.id)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/shop</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
${categoryUrls}
${productUrls}
</urlset>
`;
}

function buildSitemapIndex() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>${SITE}/sitemap-locales.xml</loc></sitemap>
  <sitemap><loc>${SITE}/sitemap-actualites.xml</loc></sitemap>
  <sitemap><loc>${SITE}/sitemap-shop.xml</loc></sitemap>
  <sitemap><loc>${SITE}/news-sitemap.xml</loc></sitemap>
  <sitemap><loc>${SITE}/google-news-sitemap.xml</loc></sitemap>
</sitemapindex>
`;
}

function main() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    throw new Error(`Public directory not found: ${PUBLIC_DIR}`);
  }

  const newsItems = buildNewsItems(parseSeoNews());
  const shopItems = assignProductIds(parseShopSeeds());

  writeText(path.join(PUBLIC_DIR, "rss.xml"), buildRss(newsItems));
  writeText(path.join(PUBLIC_DIR, "atom.xml"), buildAtom(newsItems));
  writeText(path.join(PUBLIC_DIR, "news-sitemap.xml"), buildNewsSitemap(newsItems));
  writeText(path.join(PUBLIC_DIR, "google-news-sitemap.xml"), buildGoogleNewsSitemap(newsItems));
  writeText(path.join(PUBLIC_DIR, "sitemap-actualites.xml"), buildNewsSitemap(newsItems));
  writeText(path.join(PUBLIC_DIR, "shop-feed.xml"), buildShopFeed(shopItems));
  writeText(path.join(PUBLIC_DIR, "google-merchant.xml"), buildGoogleMerchantFeed(shopItems));
  writeText(path.join(PUBLIC_DIR, "sitemap-shop.xml"), buildShopSitemap(shopItems));
  writeText(path.join(PUBLIC_DIR, "sitemap.xml"), buildSitemapIndex());

  console.log(`Generated SEO artifacts: ${newsItems.length} news items, ${shopItems.length} products.`);
}

main();
