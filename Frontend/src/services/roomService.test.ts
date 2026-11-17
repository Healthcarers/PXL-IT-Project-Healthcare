
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api'
import { roomService } from './roomService'
import type { Room, RoomParticipant } from '../types/room'

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
}))

const mockRoom: Room = {
  id: 'room-1',
  code: 'ABC123',
  name: 'Testroom',
  description: 'Beschrijving',
  createdAt: '2026-11-13T10:00:00',
  status: 'OPEN',
  ownerId: 'user-1',
  participantCount: 1,
}

const mockParticipant: RoomParticipant = {
  id: 'participant-1',
  userId: 'user-1',
  firstname: 'Ada',
  lastname: 'Lovelace',
  joinedAt: '2026-11-13T10:00:00',
}

describe('roomService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maakt een room aan en haalt deze daarna op', async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ code: 'ABC123' })
      .mockResolvedValueOnce(mockRoom)

    const result = await roomService.create({
      name: 'Testroom',
      description: 'Beschrijving',
    })

    expect(result).toEqual(mockRoom)
    expect(apiRequest).toHaveBeenNthCalledWith(1, '/rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Testroom',
        description: 'Beschrijving',
      }),
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/rooms/ABC123')
  })

  it('haalt een room op via de code', async () => {
    vi.mocked(apiRequest).mockResolvedValue(mockRoom)

    const result = await roomService.getByCode('ABC123')

    expect(result).toEqual(mockRoom)
    expect(apiRequest).toHaveBeenCalledWith('/rooms/ABC123')
  })

  it('encodeert de roomcode bij het ophalen', async () => {
    vi.mocked(apiRequest).mockResolvedValue(mockRoom)

    await roomService.getByCode('ABC 123')

    expect(apiRequest).toHaveBeenCalledWith('/rooms/ABC%20123')
  })

  it('sluit een room en haalt de bijgewerkte room op', async () => {
    const closedRoom = { ...mockRoom, status: 'CLOSED' as const }

    vi.mocked(apiRequest)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(closedRoom)

    const result = await roomService.close('ABC123')

    expect(result).toEqual(closedRoom)
    expect(apiRequest).toHaveBeenNthCalledWith(1, '/rooms/ABC123/close', {
      method: 'PATCH',
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/rooms/ABC123')
  })

  it('laat een gebruiker deelnemen aan een room', async () => {
    vi.mocked(apiRequest).mockResolvedValue(mockParticipant)

    const result = await roomService.join('ABC123')

    expect(result).toEqual(mockParticipant)
    expect(apiRequest).toHaveBeenCalledWith('/rooms/ABC123/join', {
      method: 'POST',
    })
  })

  it('haalt de deelnemers van een room op', async () => {
    vi.mocked(apiRequest).mockResolvedValue([mockParticipant])

    const result = await roomService.getParticipants('ABC123')

    expect(result).toEqual([mockParticipant])
    expect(apiRequest).toHaveBeenCalledWith('/rooms/ABC123/members')
  })

  it('start een room en haalt de bijgewerkte room op', async () => {
    const startedRoom = { ...mockRoom, status: 'STARTED' as const }

    vi.mocked(apiRequest)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(startedRoom)

    const result = await roomService.start('ABC123')

    expect(result).toEqual(startedRoom)
    expect(apiRequest).toHaveBeenNthCalledWith(1, '/rooms/ABC123/start', {
      method: 'POST',
    })
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/rooms/ABC123')
  })
})
