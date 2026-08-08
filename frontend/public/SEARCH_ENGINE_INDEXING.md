International indexing checklist (Lovanet)

This project is configured for broad crawler compatibility via:
- robots.txt with explicit sitemap URLs
- sitemap index + page sitemap + locale sitemap
- JSON-LD Organization/WebSite/WebPage + navigation schema
- optional verification meta tags in app head

Supported optional env vars (set in production):
- REACT_APP_GOOGLE_SITE_VERIFICATION
- REACT_APP_BING_SITE_VERIFICATION
- REACT_APP_YANDEX_SITE_VERIFICATION
- REACT_APP_BAIDU_SITE_VERIFICATION
- REACT_APP_NAVER_SITE_VERIFICATION

Google Search Console direct access (secure, without sharing your Google password):
1) In Google Cloud, create a Service Account and enable Search Console API.
2) Download JSON key and store it locally at:
	frontend/.secrets/gsc-service-account.json
3) In Google Search Console > your property > Settings > Users and permissions:
	add the service-account email as Owner.
4) Set env vars when needed:
	- GSC_SITE_URL=sc-domain:lovanet.fr
	- GSC_SERVICE_ACCOUNT_FILE=/app/frontend/.secrets/gsc-service-account.json
5) Run:
	- npm run seo:gsc:doctor
	- npm run seo:gsc
	- or npm run seo:publish:all

Important:
- Never commit service account keys.
- Keep .secrets/ outside git and deployment artifacts unless secured.

Submission targets (recommended):
1) Google Search Console: submit https://lovanet.fr/sitemap.xml
2) Bing Webmaster Tools (covers Bing + Ecosia + Yahoo partnerships depending on region): submit https://lovanet.fr/sitemap.xml
3) Yandex Webmaster: submit https://lovanet.fr/sitemap.xml
4) Baidu Search Resource Platform: submit https://lovanet.fr/sitemap.xml
5) Naver Search Advisor: submit https://lovanet.fr/sitemap.xml

Google-specific publishing suggestions:
1) Google News Publisher Center:
	- Use https://lovanet.fr/rss.xml as publication feed
	- Use https://lovanet.fr/google-news-sitemap.xml as complementary news sitemap
2) Google Merchant Center:
	- Use https://lovanet.fr/google-merchant.xml as primary product feed
	- Keep product URLs crawlable and update feed via seo:generate before deploy
3) Search Console API automation:
	- Use npm run seo:gsc to submit all sitemaps programmatically
	- Use npm run seo:publish:all for full pipeline (generate + validate + ping + GSC)

Notes:
- Brave and Opera rely mostly on mainstream web indexes (Google/Bing ecosystems depending on market and feature).
- Indexation speed and sitelinks display remain search-engine decisions.
- Keep canonical, hreflang, and sitemap URLs consistent with production domain.
