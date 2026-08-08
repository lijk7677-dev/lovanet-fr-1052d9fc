import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FRONTEND_ROOT = ROOT.endsWith("/frontend") ? ROOT : path.join(ROOT, "frontend");

const MUST_EXIST = [
  "public/robots.txt",
  "public/sitemap.xml",
  "public/sitemap-pages.xml",
  "public/sitemap-locales.xml",
  "public/sitemap-shop.xml",
  "public/sitemap-actualites.xml",
  "public/news-sitemap.xml",
  "public/google-news-sitemap.xml",
  "public/rss.xml",
  "public/atom.xml",
  "public/shop-feed.xml",
  "public/google-merchant.xml",
  "public/index.html",
  "src/components/LocalizedHead.tsx",
];

function fail(message) {
  console.error(`SEO validation failed: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function read(rel) {
  return fs.readFileSync(path.join(FRONTEND_ROOT, rel), "utf8");
}

function ensureContains(rel, pattern, label) {
  const content = read(rel);
  if (!pattern.test(content)) {
    fail(`${rel} missing ${label}`);
  } else {
    ok(`${rel} has ${label}`);
  }
}

function main() {
  MUST_EXIST.forEach((rel) => {
    const abs = path.join(FRONTEND_ROOT, rel);
    if (!fs.existsSync(abs)) fail(`missing file ${rel}`);
    else ok(`file exists ${rel}`);
  });

  ensureContains("public/robots.txt", /Sitemap:\s+https:\/\/lovanet\.fr\/sitemap\.xml/, "main sitemap declaration");
  ensureContains("public/sitemap.xml", /sitemapindex/, "sitemap index root");
  ensureContains("public/sitemap.xml", /sitemap-shop\.xml/, "shop sitemap link");
  ensureContains("public/sitemap.xml", /news-sitemap\.xml/, "news sitemap link");
  ensureContains("public/sitemap.xml", /google-news-sitemap\.xml/, "google news sitemap link");

  ensureContains("src/components/LocalizedHead.tsx", /google-site-verification/, "Google verification meta support");
  ensureContains("src/components/LocalizedHead.tsx", /msvalidate\.01/, "Bing verification meta support");
  ensureContains("src/components/LocalizedHead.tsx", /yandex-verification/, "Yandex verification meta support");
  ensureContains("src/components/LocalizedHead.tsx", /baidu-site-verification/, "Baidu verification meta support");
  ensureContains("src/components/LocalizedHead.tsx", /naver-site-verification/, "Naver verification meta support");
  ensureContains("src/components/LocalizedHead.tsx", /SiteNavigationElement/, "navigation structured data");
  ensureContains("src/components/LocalizedHead.tsx", /hasOfferCatalog/, "service catalog schema");

  ensureContains("public/index.html", /rel="icon"/, "favicon declarations");
  ensureContains("public/index.html", /rel="manifest"/, "manifest declaration");

  if (process.exitCode && process.exitCode !== 0) {
    console.error("SEO validation completed with errors.");
    process.exit(process.exitCode);
  }

  console.log("SEO validation passed.");
}

main();
