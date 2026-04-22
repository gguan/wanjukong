export function usePublicApi() {
  const config = useRuntimeConfig();
  // On the server, prefer the internal API URL (e.g. http://api:3001 inside
  // the docker network) so SSR doesn't hairpin out through the public
  // hostname and Nginx. Browsers always use the public URL.
  const internal = (config as { apiBaseInternal?: string }).apiBaseInternal;
  const baseUrl =
    import.meta.server && internal ? internal : (config.public.apiBase as string);

  // Nitro's $fetch<T> returns TypedInternalResponse<..., T, ...> which is a
  // conditional mapping TS won't narrow to T without a cast. We assert the
  // runtime shape here so every call site gets plain T rather than the
  // conditional helper type leaking out.
  async function get<T>(path: string): Promise<T> {
    return (await $fetch<T>(`${baseUrl}/api${path}`, {
      credentials: 'include',
    })) as T;
  }

  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return (await $fetch<T>(`${baseUrl}/api${path}`, {
      method: 'POST',
      body,
      credentials: 'include',
    })) as T;
  }

  async function put<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return (await $fetch<T>(`${baseUrl}/api${path}`, {
      method: 'PUT',
      body,
      credentials: 'include',
    })) as T;
  }

  async function del<T>(path: string): Promise<T> {
    return (await $fetch<T>(`${baseUrl}/api${path}`, {
      method: 'DELETE',
      credentials: 'include',
    })) as T;
  }

  return { get, post, put, del, baseUrl };
}
