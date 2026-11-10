export const useApi = () => {
  const baseURL = useRuntimeConfig().public.apiBase as string
  return <T>(path: string, options: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(path, { baseURL, ...options })
}