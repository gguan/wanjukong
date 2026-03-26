export function useAdminApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;

  function request<T>(path: string, opts?: Record<string, unknown>): Promise<T> {
    return $fetch<T>(`${baseUrl}${path}`, {
      credentials: 'include',
      ...opts,
      onResponseError({ response }) {
        if (response.status === 401) {
          const auth = useAdminAuthStore();
          if (auth.user) {
            auth.clear();
            navigateTo('/login');
          }
        }
      },
    });
  }

  return {
    get<T>(path: string): Promise<T> {
      return request<T>(path);
    },
    post<T>(path: string, body: unknown): Promise<T> {
      return request<T>(path, { method: 'POST', body });
    },
    put<T>(path: string, body: unknown): Promise<T> {
      return request<T>(path, { method: 'PUT', body });
    },
    patch<T>(path: string, body?: unknown): Promise<T> {
      return request<T>(path, { method: 'PATCH', body });
    },
    del<T>(path: string): Promise<T> {
      return request<T>(path, { method: 'DELETE' });
    },
  };
}
