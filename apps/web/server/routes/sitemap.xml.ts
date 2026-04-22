/**
 * Dynamic sitemap.xml — indexes the public, static pages of the storefront
 * plus every ACTIVE product and brand fetched from the API. Served at the
 * canonical /sitemap.xml path and declared in /public/robots.txt.
 *
 * Cached in Nitro for 1h so a Google crawl doesn't hammer the API.
 */

import { defineEventHandler, setHeader } from 'h3';

interface BrandLite {
  slug: string;
  updatedAt?: string;
}

interface ProductLite {
  slug: string;
  updatedAt?: string;
  status?: string;
}

interface ProductsResp {
  data: ProductLite[];
  total: number;
}

// Static page paths. These are the public, SEO-relevant pages. Anything
// transactional or account-related is omitted so it can't be indexed.
const STATIC_PATHS = [
  '/',
  '/products',
  '/brands',
  '/about',
  '/contact',
  '/shipping',
  '/returns',
  '/faq',
  '/privacy',
  '/cookies',
];

// Supported locales for hreflang alternates. Keep in sync with nuxt.config.ts.
const LOCALES = ['en', 'ja', 'zh-CN', 'zh-TW'];
const DEFAULT_LOCALE = 'en';

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function localizedUrl(siteUrl: string, path: string, locale: string): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return `${siteUrl}${prefix}${path === '/' ? '' : path}` || siteUrl;
}

function renderUrl(siteUrl: string, path: string, lastmod?: string, changefreq = 'weekly', priority = 0.6): string {
  const loc = localizedUrl(siteUrl, path, DEFAULT_LOCALE);
  const alts = LOCALES.map(
    (l) =>
      `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(
        localizedUrl(siteUrl, path, l),
      )}"/>`,
  ).join('\n');
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alts}
  </url>`;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const siteUrl = (config.public.siteUrl as string) || 'https://overrealm.shop';

  // Prefer internal API URL when present (avoids hairpin through Nginx).
  const internal = (config as { apiBaseInternal?: string }).apiBaseInternal;
  const apiBase = internal || (config.public.apiBase as string);

  let products: ProductLite[] = [];
  let brands: BrandLite[] = [];
  try {
    const [productsResp, brandsResp] = await Promise.all([
      $fetch<ProductsResp>(`${apiBase}/api/public/products?limit=500&lang=en`),
      $fetch<BrandLite[]>(`${apiBase}/api/public/brands?lang=en`),
    ]);
    products = (productsResp.data || []).filter((p) => p.status !== 'DRAFT' && p.status !== 'INACTIVE');
    brands = brandsResp || [];
  } catch {
    // If the API is unreachable we still serve a valid sitemap with the
    // static pages — better than 500ing at Google's crawler.
  }

  const now = new Date().toISOString();

  const urls: string[] = [];

  // Static pages — high priority for the homepage, medium for the rest.
  for (const p of STATIC_PATHS) {
    const priority = p === '/' ? 1.0 : 0.7;
    urls.push(renderUrl(siteUrl, p, now, 'weekly', priority));
  }

  // Brand hubs
  for (const b of brands) {
    urls.push(renderUrl(siteUrl, `/brands/${b.slug}`, b.updatedAt, 'weekly', 0.6));
  }

  // Product pages
  for (const p of products) {
    urls.push(renderUrl(siteUrl, `/products/${p.slug}`, p.updatedAt, 'daily', 0.8));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  // Cache for 1 hour at the edge and browser
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return xml;
});
