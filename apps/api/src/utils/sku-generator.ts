/**
 * SKU generation and normalization utilities.
 *
 * SKU format: BRAND-MODEL-VARIANT
 * Examples: HT-MMS617-STD, DAM-DMS032-DLX, TZ-ULTRA01-SPC
 */

// ─── Variant name → code mapping ────────────────────────

const VARIANT_CODE_MAP: Record<string, string> = {
  standard: 'STD',
  'standard edition': 'STD',
  deluxe: 'DLX',
  'deluxe edition': 'DLX',
  exclusive: 'EXC',
  'exclusive edition': 'EXC',
  special: 'SPC',
  'special edition': 'SPC',
  limited: 'LTD',
  'limited edition': 'LTD',
  collector: 'COL',
  "collector's edition": 'COL',
  'collector edition': 'COL',
  premium: 'PRM',
  'premium edition': 'PRM',
};

/**
 * Derive a short code from variant name.
 * e.g. "Standard Edition" → "STD", "Deluxe" → "DLX", "Custom Name" → "CUS"
 */
export function getVariantCode(variantName: string): string {
  const lower = variantName.trim().toLowerCase();
  if (VARIANT_CODE_MAP[lower]) return VARIANT_CODE_MAP[lower];

  // Take first 3 uppercase letters of first word
  const firstWord = lower.replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/)[0] || 'VAR';
  return firstWord.slice(0, 3).toUpperCase();
}

/**
 * Derive a short brand code.
 * Uses brand.code if available, otherwise abbreviates the name.
 * e.g. "Hot Toys" → "HT", "DAMTOYS" → "DAM", "Threezero" → "TZ"
 */
export function getBrandCode(brandName: string, brandCode?: string | null): string {
  if (brandCode) return normalizeSku(brandCode);

  const name = brandName.trim().toUpperCase();

  // If single word ≤ 4 chars, use as-is
  if (!/\s/.test(name) && name.length <= 4) {
    return name.replace(/[^A-Z0-9]/g, '');
  }

  // Multi-word: take first letter of each word
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]).join('').slice(0, 3);
  }

  // Single long word: first 2-3 chars
  return name.replace(/[^A-Z0-9]/g, '').slice(0, 3);
}

/**
 * Extract a model/base code from product info.
 * Priority: manufacturerSku → product name tokens → slug tokens → fallback.
 */
export function getModelCode(opts: {
  manufacturerSku?: string | null;
  productName?: string;
  slug?: string;
}): string {
  // 1. Use manufacturerSku if available
  if (opts.manufacturerSku) {
    return normalizeSku(opts.manufacturerSku).slice(0, 12);
  }

  // 2. Extract alphanumeric model code from product name
  //    e.g. "Hot Toys MMS617 Spider-Man" → "MMS617"
  if (opts.productName) {
    const match = opts.productName.match(/[A-Z]{2,}[\-]?\d{2,}/i);
    if (match) return match[0].toUpperCase().replace(/-/g, '');
  }

  // 3. Use slug tokens
  if (opts.slug) {
    const parts = opts.slug.split('-').filter(Boolean);
    // Skip very generic tokens, take meaningful part
    const meaningful = parts.filter((p) => p.length >= 3).slice(0, 2);
    if (meaningful.length > 0) {
      return meaningful.join('-').toUpperCase().slice(0, 10);
    }
  }

  // 4. Fallback
  return 'PROD';
}

/**
 * Normalize a SKU string: uppercase, A-Z 0-9 hyphen only.
 */
export function normalizeSku(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-')      // spaces/underscores → hyphens
    .replace(/[^A-Z0-9\-]/g, '')  // remove invalid chars
    .replace(/-{2,}/g, '-')       // collapse duplicate hyphens
    .replace(/^-|-$/g, '');       // trim leading/trailing hyphens
}

/**
 * Generate a candidate SKU from brand, product, and variant info.
 */
export function generateSkuCandidate(opts: {
  brandName: string;
  brandCode?: string | null;
  manufacturerSku?: string | null;
  productName?: string;
  slug?: string;
  variantName: string;
}): string {
  const brand = getBrandCode(opts.brandName, opts.brandCode);
  const model = getModelCode({
    manufacturerSku: opts.manufacturerSku,
    productName: opts.productName,
    slug: opts.slug,
  });
  const variant = getVariantCode(opts.variantName);

  return normalizeSku(`${brand}-${model}-${variant}`);
}

/**
 * Ensure a SKU is unique by appending -2, -3, etc. if needed.
 * @param candidate The desired SKU
 * @param existingSkus Set of all existing SKUs (lowercase for case-insensitive check)
 * @param excludeId Optional variant ID to exclude from the check (for update scenarios)
 */
export function ensureUniqueSku(
  candidate: string,
  existingSkus: Set<string>,
  excludeId?: string,
): string {
  const normalized = normalizeSku(candidate);
  if (!existingSkus.has(normalized.toUpperCase())) return normalized;

  let suffix = 2;
  while (existingSkus.has(`${normalized}-${suffix}`.toUpperCase())) {
    suffix++;
    if (suffix > 100) break; // safety valve
  }
  return `${normalized}-${suffix}`;
}
