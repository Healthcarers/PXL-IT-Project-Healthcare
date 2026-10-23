
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const responseText = await response.text()

    throw new Error(
      `Aanvraag naar ${url} mislukt (${response.status}): ${responseText}`,
    )
  }

  return response.json() as Promise<T>
}
