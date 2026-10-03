# Search measurement

QRCraftly measures search performance without adding anything to its pages: no analytics script, no beacon, no cookie. Everything below comes from the search engines' own consoles and from Cloudflare's zone-level request counts, which need no page code. See the [No-Ads Pledge](./PLEDGE.md) for why.

## Tools

| Tool                     | What it gives us                                                                                               | Setup                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Google Search Console    | Impressions, clicks, CTR and average position per query and page; page indexing; Core Web Vitals field data    | `qrcraftly.com` **Domain property**, verified with a DNS TXT record in Cloudflare. Sitemap: `https://qrcraftly.com/sitemap.xml` |
| Bing Webmaster Tools     | The same for Bing, plus IndexNow submissions it received                                                       | Imported from Search Console. Same sitemap                                                                                      |
| Cloudflare Crawler Hints | Tells IndexNow engines (Bing, Yandex, Seznam, Naver) when a URL has changed, so they recrawl after each deploy | One toggle under **Caching → Configuration** for the `qrcraftly.com` zone. No key file or code in this repository               |

Only `qrcraftly.com` is indexed. Every page's canonical link points there, and `public/_headers` sends `X-Robots-Tag: noindex` on every `*.fpderuiter.workers.dev` host, so preview builds and the workers.dev copy of production stay out of search results.

## KPIs

| KPI                                                                                                                 | Where                                                                      | Goal                                                            |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Indexed pages vs sitemap URLs                                                                                       | Search Console → Pages                                                     | Every sitemap URL indexed; every "not indexed" reason explained |
| Non-brand clicks and impressions                                                                                    | Search Console → Performance, with queries containing "qrcraftly" excluded | Rising month on month                                           |
| Top-10 positions for the P1 query clusters (Wi-Fi, vCard, free QR code without sign-up, QR codes that never expire) | Search Console → Performance, filtered by query                            | More P1 queries in the top 10 each quarter                      |
| Core Web Vitals "good" share                                                                                        | Search Console → Core Web Vitals (mobile and desktop)                      | 100% of URLs good                                               |
| Referring domains                                                                                                   | Search Console → Links → Top linking sites                                 | Rising                                                          |

## Monthly review

Once a month:

1. Export Search Console **Performance** for the last 28 days (queries and pages).
2. Check the KPIs above against last month and note them in the SEO tracking issue.
3. Move pages with many impressions but a CTR well below their position's norm into a title and description rewrite queue.
4. Check **Pages** for new "Crawled, currently not indexed" or "Duplicate" reasons and file an issue for each pattern.
5. Check Bing Webmaster Tools → **IndexNow** to confirm Crawler Hints is still submitting URLs after deploys.
