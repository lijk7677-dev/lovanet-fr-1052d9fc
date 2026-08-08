import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const FRONTEND_ROOT = ROOT.endsWith("/frontend") ? ROOT : path.join(ROOT, "frontend");
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
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
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

function loadServiceAccount(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed.client_email || !parsed.private_key || !parsed.token_uri) {
    throw new Error("Invalid service account file: missing client_email/private_key/token_uri");
  }
  return parsed;
}

async function listProperties(accessToken) {
  const response = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
    method: "GET",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`sites.list failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return Array.isArray(data.siteEntry) ? data.siteEntry : [];
}

async function main() {
  console.log("GSC Doctor: checking service-account configuration...");
  console.log(`Expected key file: ${SA_FILE}`);
  console.log(`Target property: ${SITE_URL}`);

  const serviceAccount = loadServiceAccount(SA_FILE);
  if (!serviceAccount) {
    console.log("\nStatus: MISSING_KEY_FILE");
    console.log("Action: place your JSON key at the expected path or set GSC_SERVICE_ACCOUNT_FILE.");
    process.exit(1);
  }

  console.log(`\nService account loaded: ${serviceAccount.client_email}`);

  const token = await getAccessToken(serviceAccount);
  console.log("OAuth token: OK");

  const properties = await listProperties(token);
  if (!properties.length) {
    console.log("\nStatus: NO_PROPERTIES_VISIBLE");
    console.log("Action: in Search Console, add service-account email as Owner on the property.");
    process.exit(1);
  }

  console.log("\nVisible properties:");
  for (const prop of properties) {
    console.log(`- ${prop.siteUrl} (${prop.permissionLevel || "unknown"})`);
  }

  const hasTarget = properties.some((p) => p.siteUrl === SITE_URL);
  if (!hasTarget) {
    console.log("\nStatus: TARGET_NOT_VISIBLE");
    console.log(`Action: add ${serviceAccount.client_email} as Owner on ${SITE_URL} in Search Console.`);
    process.exit(1);
  }

  console.log("\nStatus: READY");
  console.log("You can now run: npm run seo:gsc");
}

main().catch((error) => {
  console.error(`GSC doctor error: ${error.message}`);
  process.exit(1);
});
