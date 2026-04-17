/**
 * Fetches today's USD/CNY exchange rate from Frankfurter (ECB reference rate).
 * Cached in memory + sessionStorage for the session so we don't hammer the API.
 *
 * Frankfurter is free, no API key, backed by the European Central Bank.
 * Rate updates once per business day around 16:00 CET.
 */

const CACHE_KEY = 'wjk_usdcny_rate_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachedRate {
  rate: number; // 1 USD = X CNY
  fetchedAt: number; // epoch ms
  date: string; // ECB rate date (YYYY-MM-DD)
}

const _state = reactive({
  rate: 0 as number,
  date: '' as string,
  loading: false,
  error: '' as string,
});

let _loaded = false;

async function fetchRate() {
  _state.loading = true;
  _state.error = '';
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=CNY');
    if (!res.ok) throw new Error('network');
    const data = (await res.json()) as { rates: { CNY: number }; date: string };
    _state.rate = data.rates.CNY;
    _state.date = data.date;
    if (import.meta.client) {
      const cached: CachedRate = { rate: data.rates.CNY, date: data.date, fetchedAt: Date.now() };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    }
  } catch {
    _state.error = '汇率获取失败';
  } finally {
    _state.loading = false;
  }
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
