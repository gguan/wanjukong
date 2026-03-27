export function usePublicApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase as string;

  async function get<T>(path: string): Promise<T> {
    return $fetch<T>(`${baseUrl}/api${path}`, {
      credentials: 'include',
    });
  }

  async function post<T>(path: string, body: Record<string, any>): Promise<T> {
    return $fetch<T>(`${baseUrl}/api${path}`, {
      method: 'POST',
      body,
      credentials: 'include',
    });
  }

  async function put<T>(path: string, body: Record<string, any>): Promise<T> {
    return $fetch<T>(`${baseUrl}/api${path}`, {
      method: 'PUT',
      body,
      credentials: 'include',
    });
  }

  async function del<T>(path: string): Promise<T> {
    return $fetch<T>(`${baseUrl}/api${path}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  return { get, post, put, del, baseUrl };
}
