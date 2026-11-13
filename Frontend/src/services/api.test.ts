
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api'
import { API_BASE_URL } from '../config/api'

describe('apiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('voert een GET-aanvraag uit met de juiste URL en credentials', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Succes' }), {
        status: 200,
      }),
    )

    const result = await apiRequest<{ message: string }>('/rooms')

    expect(result).toEqual({ message: 'Succes' })
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/rooms`,
      expect.objectContaining({
        credentials: 'include',
        headers: expect.any(Headers),
      }),
    )
  })

  it('voegt automatisch Content-Type application/json toe bij een body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
      }),
    )

    await apiRequest('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name: 'Testroom' }),
    })

    const [, options] = vi.mocked(fetch).mock.calls[0]!

    expect((options?.headers as Headers).get('Content-Type'))
      .toBe('application/json')
  })

  it('behoudt zelf opgegeven headers', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('{}', { status: 200 }),
    )

    await apiRequest('/rooms', {
      headers: {
        Authorization: 'Bearer test-token',
      },
    })

    const [, options] = vi.mocked(fetch).mock.calls[0]!

    expect((options?.headers as Headers).get('Authorization'))
      .toBe('Bearer test-token')
  })

  it('gooit een fout wanneer de aanvraag mislukt', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Room niet gevonden', {
        status: 404,
      }),
    )

    await expect(apiRequest('/rooms/ABC123'))
      .rejects.toThrow('Aanvraag mislukt (404): Room niet gevonden')
  })

  it('geeft undefined terug bij HTTP 204', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 204 }),
    )

    const result = await apiRequest('/rooms/ABC123')

    expect(result).toBeUndefined()
  })

  it('geeft undefined terug bij een lege response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('', { status: 200 }),
    )

    const result = await apiRequest('/rooms')

    expect(result).toBeUndefined()
  })

  it('zet een JSON-response om naar een object', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({
        id: 'room-1',
        name: 'Testroom',
      }), {
        status: 200,
      }),
    )

    const result = await apiRequest<{ id: string; name: string }>('/rooms')

    expect(result).toEqual({
      id: 'room-1',
      name: 'Testroom',
    })
  })
})
