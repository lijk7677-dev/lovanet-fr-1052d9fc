const SITEMAPS = [
  "https://lovanet.fr/sitemap.xml",
  "https://lovanet.fr/sitemap-pages.xml",
  "https://lovanet.fr/sitemap-locales.xml",
  "https://lovanet.fr/sitemap-actualites.xml",
  "https://lovanet.fr/sitemap-shop.xml",
  "https://lovanet.fr/news-sitemap.xml",
];

const GET_PING_ENGINES = [
  {
    name: "Bing Webmaster Ping",
    buildUrl: (sitemap) => `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
  },
  {
    name: "Yandex Ping",
    buildUrl: (sitemap) => `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemap)}`,
  },
];

async function pingGetEngines() {
  const results = [];
  for (const engine of GET_PING_ENGINES) {
    for (const sitemap of SITEMAPS) {
      const url = engine.buildUrl(sitemap);
      try {
        const res = await fetch(url, { method: "GET" });
        results.push({
          engine: engine.name,
          sitemap,
          ok: res.ok,
          status: res.status,
        });
      } catch (error) {
        results.push({
          engine: engine.name,
          sitemap,
          ok: false,
          status: -1,
          error: String(error),
        });
      }
    }
  }
  return results;
}

async function submitIndexNow() {
  const key = process.env.INDEXNOW_KEY;
  const host = process.env.INDEXNOW_HOST || "lovanet.fr";
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION || `https://${host}/${key || ""}.txt`;

  if (!key) {
    return {
      skipped: true,
      message: "INDEXNOW_KEY not set. IndexNow skipped.",
    };
  }

  const body = {
    host,
    key,
    keyLocation,
    urlList: [
      "https://lovanet.fr/",
      "https://lovanet.fr/shop",
      "https://lovanet.fr/actualites",
      "https://lovanet.fr/anime-catalog",
      "https://lovanet.fr/profile",
      "https://lovanet.fr/login",
    ],
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return {
      skipped: false,
      ok: res.ok,
      status: res.status,
      message: `IndexNow response status: ${res.status}`,
    };
  } catch (error) {
    return {
      skipped: false,
      ok: false,
      status: -1,
      message: `IndexNow error: ${String(error)}`,
    };
  }
}

function printTable(title, rows) {
  console.log(`\n${title}`);
  for (const row of rows) {
    const status = row.ok ? "OK" : "FAIL";
    const extra = row.error ? ` | ${row.error}` : "";
    console.log(`- ${status} | ${row.engine} | ${row.status} | ${row.sitemap}${extra}`);
  }
}

async function main() {
  console.log("Submitting sitemap pings to available search engines...");
  const pingResults = await pingGetEngines();
  printTable("Ping results", pingResults);

  const indexNow = await submitIndexNow();
  if (indexNow.skipped) {
    console.log(`\nIndexNow: SKIPPED | ${indexNow.message}`);
  } else {
    console.log(`\nIndexNow: ${indexNow.ok ? "OK" : "FAIL"} | ${indexNow.message}`);
  }

  const failed = pingResults.some((r) => !r.ok) || (!indexNow.skipped && !indexNow.ok);
  if (failed) {
    console.log("\nSome submissions failed. You can still submit manually in webmaster consoles.");
    process.exitCode = 1;
    return;
  }

  console.log("\nAll available ping submissions completed successfully.");
}

main();
