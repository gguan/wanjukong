export interface CustomerProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerifiedAt: string | null;
}

const _customer = ref<CustomerProfile | null>(null);
let _fetched = false;

export function useStorefrontAuth() {
  const { get, post } = usePublicApi();

  const customer = readonly(_customer);
  const isLoggedIn = computed(() => !!_customer.value);

  // Resolve the active locale lazily — reading via useNuxtApp keeps this
  // callable from route middleware (which has no active Vue setup and so
  // cannot call useI18n / useLang directly).
  function getLocale(): string {
    try {
      const nuxtApp = useNuxtApp();
      const i18n = (nuxtApp as unknown as { $i18n?: { locale?: { value?: string } } }).$i18n;
      return i18n?.locale?.value || 'en';
    } catch {
      return 'en';
    }
  }

  async function fetchMe() {
    try {
      const data = await get<CustomerProfile | null>('/public/auth/me');
      _customer.value = data;
      _fetched = true;
    } catch {
      _customer.value = null;
      _fetched = true;
    }
  }

  // Auto-fetch on first use (client only)
  if (import.meta.client && !_fetched) {
    fetchMe();
  }

  async function register(email: string, password: string, name?: string) {
    const res = await post<{ customer: CustomerProfile; verificationRequired: boolean }>(
      '/public/auth/register',
      { email, password, name, locale: getLocale() },
    );
    return res;
  }

  async function login(email: string, password: string) {
    const res = await post<{ customer: CustomerProfile }>(
      '/public/auth/login',
      { email, password },
    );
    _customer.value = res.customer;
    _fetched = true;
    return res.customer;
  }

  async function logout() {
    await post('/public/auth/logout', {});
    _customer.value = null;
  }

  async function verifyEmail(token: string) {
    return post<{ verified: boolean }>('/public/auth/verify-email', {
      token,
      locale: getLocale(),
    });
  }

  async function resendVerification(email: string) {
    return post('/public/auth/resend-verification', { email, locale: getLocale() });
  }

  async function forgotPassword(email: string) {
    return post('/public/auth/forgot-password', { email, locale: getLocale() });
  }

  async function resetPassword(token: string, newPassword: string) {
    return post<{ reset: boolean }>('/public/auth/reset-password', { token, newPassword });
  }

  return {
    customer,
    isLoggedIn,
    fetchMe,
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
  };
}
