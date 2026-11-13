
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRoom } from './useRoom'
import { useRoomStore } from '../stores/roomStore'
import { roomService } from '../services/roomService'
import type { Room, RoomParticipant } from '../types/room'

vi.mock('../services/roomService', () => ({
  roomService: {
    create: vi.fn(),
    getByCode: vi.fn(),
    getParticipants: vi.fn(),
    join: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
  },
}))

const mockRoom: Room = {
  id: 'room-1',
  code: 'ABC123',
  name: 'Testroom',
  description: 'Een testroom',
  createdAt: '2026-11-13T10:00:00',
  status: 'OPEN',
  ownerId: 'user-1',
  participantCount: 1,
}

const mockParticipants: RoomParticipant[] = [
  {
    id: 'participant-1',
    userId: 'user-1',
    firstname: 'Ada',
    lastname: 'Lovelace',
    joinedAt: '2026-11-13T10:00:00',
  },
]

describe('useRoom', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('maakt een room aan en laadt de deelnemers', async () => {
    vi.mocked(roomService.create).mockResolvedValue(mockRoom)
    vi.mocked(roomService.getParticipants).mockResolvedValue(mockParticipants)

    const { createRoom, currentRoom, participants, loading, error } = useRoom()

    const result = await createRoom({
      name: 'Testroom',
      description: 'Een testroom',
    })

    expect(result).toEqual(mockRoom)
    expect(currentRoom.value).toEqual(mockRoom)
    expect(participants.value).toEqual(mockParticipants)
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(roomService.create).toHaveBeenCalledOnce()
    expect(roomService.getParticipants).toHaveBeenCalledWith('ABC123')
  })

  it('geeft een fout bij het aanmaken van een room', async () => {
    vi.mocked(roomService.create).mockRejectedValue(new Error('Create mislukt'))

    const { createRoom, loading, error } = useRoom()

    await expect(
      createRoom({ name: 'Testroom', description: null }),
    ).rejects.toThrow('Create mislukt')

    expect(error.value).toBe('Create mislukt')
    expect(loading.value).toBe(false)
  })

  it('haalt een room op via de code', async () => {
    vi.mocked(roomService.getByCode).mockResolvedValue(mockRoom)

    const { loadRoom, currentRoom } = useRoom()

    const result = await loadRoom('ABC123')

    expect(result).toEqual(mockRoom)
    expect(currentRoom.value).toEqual(mockRoom)
    expect(roomService.getByCode).toHaveBeenCalledWith('ABC123')
  })

  it('geeft een fout bij het ophalen van een room', async () => {
    vi.mocked(roomService.getByCode).mockRejectedValue(new Error('Niet gevonden'))

    const { loadRoom, error, loading } = useRoom()

    await expect(loadRoom('ABC123')).rejects.toThrow('Niet gevonden')

    expect(error.value).toBe('Niet gevonden')
    expect(loading.value).toBe(false)
  })

  it('laadt de deelnemers van een room', async () => {
    vi.mocked(roomService.getParticipants).mockResolvedValue(mockParticipants)

    const { loadParticipants, participants } = useRoom()

    const result = await loadParticipants('ABC123')

    expect(result).toEqual(mockParticipants)
    expect(participants.value).toEqual(mockParticipants)
  })

  it('geeft een fout bij het laden van deelnemers', async () => {
    vi.mocked(roomService.getParticipants).mockRejectedValue(new Error('Laden mislukt'))

    const { loadParticipants, error } = useRoom()

    await expect(loadParticipants('ABC123')).rejects.toThrow('Laden mislukt')

    expect(error.value).toBe('Laden mislukt')
  })

  it('neemt deel aan de geselecteerde room', async () => {
    vi.mocked(roomService.join).mockResolvedValue(mockParticipants[0])
    vi.mocked(roomService.getByCode).mockResolvedValue(mockRoom)
    vi.mocked(roomService.getParticipants).mockResolvedValue(mockParticipants)

    const store = useRoomStore()
    store.setRoom(mockRoom)

    const { joinRoom, currentRoom, participants, loading } = useRoom()

    await joinRoom()

    expect(roomService.join).toHaveBeenCalledWith('ABC123')
    expect(roomService.getByCode).toHaveBeenCalledWith('ABC123')
    expect(participants.value).toEqual(mockParticipants)
    expect(currentRoom.value).toEqual(mockRoom)
    expect(loading.value).toBe(false)
  })

  it('kan niet deelnemen zonder geselecteerde room', async () => {
    const { joinRoom, error } = useRoom()

    await joinRoom()

    expect(error.value).toBe('Er is geen room geselecteerd.')
    expect(roomService.join).not.toHaveBeenCalled()
  })

  it('start de geselecteerde room', async () => {
    const startedRoom = { ...mockRoom, status: 'STARTED' as const }
    vi.mocked(roomService.start).mockResolvedValue(startedRoom)

    useRoomStore().setRoom(mockRoom)

    const { startRoom, currentRoom, loading } = useRoom()

    const result = await startRoom()

    expect(result).toEqual(startedRoom)
    expect(roomService.start).toHaveBeenCalledWith('ABC123')
    expect(currentRoom.value).toEqual(startedRoom)
    expect(loading.value).toBe(false)
  })

  it('kan geen room starten zonder geselecteerde room', async () => {
    const { startRoom, error } = useRoom()

    await startRoom()

    expect(error.value).toBe('Er is geen room geselecteerd.')
    expect(roomService.start).not.toHaveBeenCalled()
  })

  it('sluit de geselecteerde room', async () => {
    const closedRoom = { ...mockRoom, status: 'CLOSED' as const }
    vi.mocked(roomService.close).mockResolvedValue(closedRoom)

    useRoomStore().setRoom(mockRoom)

    const { closeRoom, currentRoom, loading } = useRoom()

    const result = await closeRoom()

    expect(result).toEqual(closedRoom)
    expect(roomService.close).toHaveBeenCalledWith('ABC123')
    expect(currentRoom.value).toEqual(closedRoom)
    expect(loading.value).toBe(false)
  })

  it('kan geen room sluiten zonder geselecteerde room', async () => {
    const { closeRoom, error } = useRoom()

    await closeRoom()

    expect(error.value).toBe('Er is geen room geselecteerd.')
    expect(roomService.close).not.toHaveBeenCalled()
  })

  it('maakt de roomstatus leeg', () => {
    const store = useRoomStore()
    store.setRoom(mockRoom)

    const { clearRoom, currentRoom, participants, error } = useRoom()

    participants.value = mockParticipants
    error.value = 'Oude fout'

    clearRoom()

    expect(currentRoom.value).toBeNull()
    expect(participants.value).toEqual([])
    expect(error.value).toBeNull()
  })
})
