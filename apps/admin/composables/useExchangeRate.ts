/**
 * Fetches today's USD/CNY exchange rate with a fallback source chain so the
 * admin always shows a USD estimate even when Frankfurter is unreachable
 * from the user's network (common problem from mainland China).
 *
 * Sources (in order):
 *   1. api.frankfurter.app             — ECB reference rate, authoritative
 *   2. latest.currency-api.pages.dev   — fawazahmed's currency-api on Cloudflare Pages
 *
 * Cached in memory + sessionStorage so we don't hammer either API.
 */

const CACHE_KEY = 'wjk_usdcny_rate_v2';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachedRate {
  rate: number; // 1 USD = X CNY
  fetchedAt: number; // epoch ms
  date: string; // rate date (YYYY-MM-DD)
}

const _state = reactive({
  rate: 0 as number,
  date: '' as string,
  loading: false,
  error: '' as string,
});

let _loaded = false;

async function fetchFromFrankfurter(): Promise<{ rate: number; date: string }> {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=CNY');
  if (!res.ok) throw new Error('frankfurter');
  const data = (await res.json()) as { rates: { CNY: number }; date: string };
  if (!data.rates?.CNY) throw new Error('frankfurter-shape');
  return { rate: data.rates.CNY, date: data.date };
}

async function fetchFromFawazahmed(): Promise<{ rate: number; date: string }> {
  // Cloudflare Pages mirror of fawazahmed/currency-api. Updates daily, CORS open.
  const res = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json');
  if (!res.ok) throw new Error('fawazahmed');
  const data = (await res.json()) as { date: string; usd: { cny: number } };
  if (!data.usd?.cny) throw new Error('fawazahmed-shape');
  return { rate: data.usd.cny, date: data.date };
}

async function fetchRate() {
  _state.loading = true;
  _state.error = '';
  const sources = [fetchFromFrankfurter, fetchFromFawazahmed];
  for (const source of sources) {
    try {
      const { rate, date } = await source();
      _state.rate = rate;
      _state.date = date;
      if (import.meta.client) {
        const cached: CachedRate = { rate, date, fetchedAt: Date.now() };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      }
      _state.loading = false;
      return;
    } catch {
      // try next source
    }
  }
  _state.error = '汇率获取失败';
  _state.loading = false;
}

export function useExchangeRate() {
  if (import.meta.client && !_loaded) {
    _loaded = true;
    // Try cache first
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedRate;
        if (Date.now() - cached.fetchedAt < CACHE_TTL_MS && cached.rate > 0) {
          _state.rate = cached.rate;
          _state.date = cached.date;
          return {
            rate: computed(() => _state.rate),
            date: computed(() => _state.date),
            loading: computed(() => _state.loading),
            error: computed(() => _state.error),
            refresh: fetchRate,
          };
        }
      }
    } catch {
      // ignore parse errors
    }
    fetchRate();
  }

  return {
    rate: computed(() => _state.rate),
    date: computed(() => _state.date),
    loading: computed(() => _state.loading),
    error: computed(() => _state.error),
    refresh: fetchRate,
  };
}
