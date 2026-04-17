/**
 * Image URL utilities.
 *
 * Storage convention: only the object key (e.g. "products/hot-toys/abc.jpg")
 * is saved in the database. When returning to clients, we prepend the
 * current COS public base URL. This lets us switch CDN domains without
 * having to update every row in the database.
 */

function getBaseUrl(): string {
  return (process.env.TENCENT_COS_PUBLIC_BASE_URL || '').replace(/\/$/, '');
}

/**
 * Given an object key, return a full public URL.
 * If the input is already a full URL, returns it unchanged.
 * Returns null/empty for null/empty input.
 */
export function toPublicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const base = getBaseUrl();
  if (!base) return key; // fallback: return raw key if no base configured
  return `${base}/${key.replace(/^\//, '')}`;
}

/**
 * Strip base URL from a full URL to get the object key.
 * If input is already a key (no scheme), returns it as-is.
 * Returns null for null/empty.
 */
export function normalizeKey(urlOrKey: string | null | undefined): string | null {
  if (!urlOrKey) return null;
  if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
    return urlOrKey.replace(/^\//, '');
  }
  // Strip known base URL
  const base = getBaseUrl();
  if (base && urlOrKey.startsWith(base + '/')) {
    return urlOrKey.slice(base.length + 1);
  }
  // Strip any *.cos.*.myqcloud.com domain (handles bucket URLs)
  const m = urlOrKey.match(/^https?:\/\/[^/]+\/(.+)$/);
  return m ? m[1] : urlOrKey;
}
