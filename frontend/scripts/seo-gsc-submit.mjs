import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const FRONTEND_ROOT = ROOT.endsWith("/frontend") ? ROOT : path.join(ROOT, "frontend");

const DEFAULT_SITEMAPS = [
  "https://lovanet.fr/sitemap.xml",
  "https://lovanet.fr/sitemap-pages.xml",
  "https://lovanet.fr/sitemap-locales.xml",
  "https://lovanet.fr/sitemap-actualites.xml",
  "https://lovanet.fr/sitemap-shop.xml",
  "https://lovanet.fr/news-sitemap.xml",
];

const SITE_URL = process.env.GSC_SITE_URL || "sc-domain:lovanet.fr";
const SA_FILE = process.env.GSC_SERVICE_ACCOUNT_FILE || path.join(FRONTEND_ROOT, ".secrets", "gsc-service-account.json");

function base64url(input) {
  const src = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return src.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwtRS256(header, payload, privateKey) {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createSign("RSA-SHA256").update(message).end().sign(privateKey);
  return `${message}.${base64url(signature)}`;
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/webmasters",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const assertion = signJwtRS256(header, payload, serviceAccount.private_key);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }).toString();

  const response = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("No access_token returned by Google OAuth");
  return data.access_token;
}

async function submitSitemap(accessToken, siteUrl, sitemapUrl) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, status: response.status, body: text };
  }
  return { ok: true, status: response.status };
}

function loadServiceAccount(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key || !parsed.token_uri) {
    throw new Error("Invalid service account file: missing client_email/private_key/token_uri");
  }
  return parsed;
}

async function main() {
  const serviceAccount = loadServiceAccount(SA_FILE);
  if (!serviceAccount) {
    console.log("GSC submit skipped: service account file not found.");
    console.log(`Expected file: ${SA_FILE}`);
    process.exit(0);
  }

  console.log(`Submitting sitemaps to Google Search Console for ${SITE_URL}...`);
  const token = await getAccessToken(serviceAccount);

  let hasFailure = false;
  for (const sitemap of DEFAULT_SITEMAPS) {
    const res = await submitSitemap(token, SITE_URL, sitemap);
    if (res.ok) {
      console.log(`OK | ${res.status} | ${sitemap}`);
    } else {
      hasFailure = true;
      console.log(`FAIL | ${res.status} | ${sitemap}`);
      if (res.body) console.log(res.body);
    }
  }

  if (hasFailure) {
    process.exitCode = 1;
    return;
  }
  console.log("Google Search Console sitemap submission completed.");
}

main().catch((error) => {
  console.error(`GSC submit error: ${error.message}`);
  process.exit(1);
});
