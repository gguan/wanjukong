export function useAdminApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;

  async function get<T>(path: string): Promise<T> {
    return $fetch<T>(`${baseUrl}${path}`);
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    return $fetch<T>(`${baseUrl}${path}`, { method: 'POST', body });
  }

  async function put<T>(path: string, body: unknown): Promise<T> {
    return $fetch<T>(`${baseUrl}${path}`, { method: 'PUT', body });
  }

  async function patch<T>(path: string, body?: unknown): Promise<T> {
    return $fetch<T>(`${baseUrl}${path}`, { method: 'PATCH', body });
  }

  async function del<T>(path: string): Promise<T> {
    return $fetch<T>(`${baseUrl}${path}`, { method: 'DELETE' });
  }

  return { get, post, put, patch, del };
}
