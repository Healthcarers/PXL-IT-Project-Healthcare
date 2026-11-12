
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api'

const DEFAULT_USER_ID = import.meta.env.VITE_DEV_USER_ID

export function getCurrentUserId(): string | undefined {
  const selectedUserId = localStorage.getItem('dev-user-id')

  return selectedUserId || DEFAULT_USER_ID
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const userId = getCurrentUserId()

  if (userId) {
    headers.set('X-User-Id', userId)
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const responseText = await response.text()

    throw new Error(
      `Aanvraag mislukt (${response.status}): ${responseText}`,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  const responseText = await response.text()

  if (!responseText) {
    return undefined as T
  }

  return JSON.parse(responseText) as T
}
