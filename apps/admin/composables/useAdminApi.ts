export function useAdminApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBaseUrl as string;

  async function get<T>(path: string): Promise<T> {
    return $fetch<T>(`${baseUrl}${path}`);
  }

  return { get };
}
