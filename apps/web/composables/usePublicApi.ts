export function usePublicApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase as string;

  async function get<T>(path: string): Promise<T> {
    return $fetch<T>(`${baseUrl}/api${path}`);
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    return $fetch<T>(`${baseUrl}/api${path}`, {
      method: 'POST',
      body,
    });
  }

  return { get, post, baseUrl };
}
